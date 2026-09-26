import { FilePenLine, LoaderCircle, Lock, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Field, FieldError } from '../components/ui/Field.jsx';
import { Loading } from '../components/ui/Skeleton.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { focusFirstError, useForm } from '../hooks/useForm.js';
import { api, assetUrl } from '../lib/api.js';
import { CATEGORIES, LOCATIONS } from '../lib/constants.js';
import { cx, plural, todayISO } from '../lib/format.js';
import { imageError, itemRules } from '../lib/validation.js';

const FIELD_ORDER = ['title', 'category', 'location', 'date', 'exactSpot', 'description', 'image', 'hiddenDetails'];

const blankValues = (type) => ({
  type,
  title: '',
  category: '',
  location: '',
  date: todayISO(),
  exactSpot: '',
  description: '',
  hiddenDetails: '',
});

export function ReportPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  useDocumentTitle(editing ? 'Edit report' : 'Report an item');

  const existing = useApi(editing ? `/api/items/${id}` : null, { keepPrevious: false });

  if (!editing) return <ReportForm />;
  if (existing.loading && !existing.data) {
    return (
      <div className="wrap section">
        <Loading label="Loading your report…" />
      </div>
    );
  }
  const item = existing.data?.item;
  if (!item || !existing.data.viewer.isOwner || item.status !== 'PENDING') {
    return (
      <div className="page section">
        <div className="wrap form-wrap">
          <div className="card">
            <EmptyState
              icon={FilePenLine}
              title={item ? "This report can't be edited" : 'Report not found'}
              headingLevel={2}
              actions={
                <Link className="btn btn-primary" to="/activity">
                  Go to My activity
                </Link>
              }
            >
              {item
                ? 'Only your own reports can be edited, and only while they are pending review. Contact an admin if something changed.'
                : 'It may have been deleted.'}
            </EmptyState>
          </div>
        </div>
      </div>
    );
  }
  return <ReportForm key={item.id} existingItem={item} />;
}

function ReportForm({ existingItem }) {
  const editing = Boolean(existingItem);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { invalidate } = useData();

  const initialType = searchParams.get('type') === 'FOUND' ? 'FOUND' : 'LOST';
  const form = useForm(
    editing
      ? {
          type: existingItem.type,
          title: existingItem.title,
          category: existingItem.category,
          location: existingItem.location,
          date: existingItem.date,
          exactSpot: existingItem.exactSpot,
          description: existingItem.description,
          hiddenDetails: existingItem.hiddenDetails ?? '',
        }
      : blankValues(initialType),
    itemRules,
  );
  const { values, errors } = form;

  const [image, setImage] = useState(null); // { file, url } for a newly picked photo
  const [keepExisting, setKeepExisting] = useState(Boolean(existingItem?.imageUrl));
  const [imageErr, setImageErr] = useState('');
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef(null);

  // Free the preview object URL when it changes or the page unmounts.
  useEffect(() => () => image && URL.revokeObjectURL(image.url), [image]);

  function pickFile(file) {
    if (!file) return;
    const err = imageError(file);
    setImageErr(err);
    if (err) {
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setImage({ file, url: URL.createObjectURL(file) });
  }

  function removePhoto() {
    setImage(null);
    setKeepExisting(false);
    setImageErr('');
    if (fileInput.current) fileInput.current.value = '';
  }

  function clearForm() {
    form.reset(blankValues(values.type));
    removePhoto();
  }

  async function onSubmit(e) {
    e.preventDefault();
    const found = form.validateAll();
    if (imageErr) found.image = imageErr;
    if (Object.keys(found).length) {
      focusFirstError(found, FIELD_ORDER);
      toast('Please fix the highlighted fields.', 'err');
      return;
    }

    setSubmitting(true);
    const body = new FormData();
    for (const [key, value] of Object.entries(values)) body.append(key, String(value).trim());
    if (image) body.append('image', image.file);
    else if (editing && existingItem.imageUrl && !keepExisting) body.append('removeImage', 'true');

    try {
      const json = await api(editing ? `/api/items/${existingItem.id}` : '/api/items', { method: editing ? 'PUT' : 'POST', body });
      invalidate();
      const { item, matches = [] } = json.data;
      toast(matches.length ? `${editing ? 'Report updated' : 'Report submitted'}. We found ${plural(matches.length, 'possible match', 'possible matches')}!` : json.message);
      // Open the new report straight away when there are matches to look at.
      navigate(matches.length ? `/activity?item=${item.id}` : '/activity');
    } catch (err) {
      if (err.errors) {
        form.setErrors(err.errors);
        if (err.errors.image) setImageErr(err.errors.image);
        focusFirstError(err.errors, FIELD_ORDER);
      }
      toast(err.message, 'err');
      setSubmitting(false);
    }
  }

  const previewUrl = image?.url ?? (keepExisting ? assetUrl(existingItem.imageUrl) : '');
  const isLost = values.type === 'LOST';

  return (
    <div className="page section">
      <div className="wrap form-wrap">
        <h2>{editing ? 'Edit your report' : 'Report an item'}</h2>
        <p className="muted">
          {editing ? 'You can edit a report until an admin reviews it.' : 'Your report goes to an admin for review before it becomes public.'}
        </p>

        <form className="card form-card" onSubmit={onSubmit} noValidate>
          <fieldset>
            <legend className="fs-title">What happened?</legend>
            <div className="seg max-w-[360px]" role="group" aria-label="Report type">
              {[
                ['LOST', 'I lost an item'],
                ['FOUND', 'I found an item'],
              ].map(([type, label]) => (
                <button key={type} type="button" aria-pressed={values.type === type} onClick={() => form.setValue('type', type)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="fs-title">Item details</legend>
            <Field id="title" label="Item name" required error={errors.title}>
              <input className="input" maxLength={60} required placeholder="e.g. Black JBL earbuds case" {...form.field('title')} />
            </Field>

            <div className="row2">
              <Field id="category" label="Category" required error={errors.category}>
                <select className="input" required {...form.field('category')}>
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field id="location" label="Location" required error={errors.location}>
                <select className="input" required {...form.field('location')}>
                  <option value="">{isLost ? 'Where did you lose it?' : 'Where did you find it?'}</option>
                  {LOCATIONS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="row2">
              <Field id="date" label={isLost ? 'Date lost' : 'Date found'} required error={errors.date}>
                <input className="input" type="date" max={todayISO()} required {...form.field('date')} />
              </Field>
              <Field id="exactSpot" label="Exact spot" optional error={errors.exactSpot}>
                <input className="input" maxLength={80} placeholder="e.g. 2nd floor, near lift" {...form.field('exactSpot')} />
              </Field>
            </div>

            <Field
              id="description"
              label="Description"
              required
              error={errors.description}
              hint={`${values.description.length}/500 · minimum 15 characters`}
            >
              <textarea
                className="input"
                maxLength={500}
                required
                placeholder="Colour, brand, size, stickers, anything visible…"
                {...form.field('description', { hintId: 'description-hint' })}
              />
            </Field>

            <div className="field">
              <span className="legend" id="photo-label">
                Photo <span className="optional">(optional, JPG/PNG/WebP, max 5 MB)</span>
              </span>
              <label
                className={cx('dropzone', dragging && 'drag')}
                htmlFor="image"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
              >
                <input
                  ref={fileInput}
                  type="file"
                  id="image"
                  accept="image/jpeg,image/png,image/webp"
                  aria-describedby={cx('photo-label', imageErr && 'image-error')}
                  aria-invalid={imageErr ? true : undefined}
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                <Upload className="mx-auto h-7 w-7 text-primary-ink" aria-hidden="true" />
                <div className="mt-1.5 font-semibold">{previewUrl ? 'Choose a different photo' : 'Tap to upload a photo'}</div>
                <div className="hint text-[.82rem] text-muted-fg">A clear photo helps owners recognise their item</div>
              </label>
              {previewUrl && (
                <div className="preview">
                  <img src={previewUrl} alt="Selected photo preview" />
                  <span className="muted min-w-0 flex-1 truncate text-[.85rem]">{image?.file.name ?? 'Current photo'}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={removePhoto}>
                    Remove
                  </button>
                </div>
              )}
              <FieldError id="image-error" message={imageErr} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="fs-title">Ownership check</legend>
            <div className="private-box">
              <Lock className="icon" aria-hidden="true" />
              <div>
                <strong>Private — never shown publicly.</strong>
                <div className="muted text-[.9rem]">
                  Only admins see this. It&apos;s used to verify claims (e.g. &quot;lock screen is a photo of a beagle&quot;, &quot;name
                  written inside the cover&quot;).
                </div>
              </div>
            </div>
            <Field id="hiddenDetails" label="Identifying detail" required error={errors.hiddenDetails}>
              <input className="input" maxLength={120} required placeholder="Something only the owner would know" {...form.field('hiddenDetails')} />
            </Field>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-3">
            {editing ? (
              <Link className="btn btn-ghost" to="/activity">
                Cancel
              </Link>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={clearForm} disabled={submitting}>
                Clear
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <LoaderCircle className="icon spin" aria-hidden="true" />
                  {editing ? 'Saving…' : 'Submitting…'}
                </>
              ) : editing ? (
                'Save changes'
              ) : (
                'Submit report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
