import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import { buildMessage } from '../lib/whatsapp'

type Draft = {
  display_name: string
  message_template: string
}

export default function Settings() {
  const { profile, refreshProfile } = useAuth()

  // null means untouched, so the fields read from the saved profile.
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!profile) return null

  const current: Draft = draft ?? {
    display_name: profile.display_name,
    message_template: profile.message_template,
  }

  const hasChanges =
    current.display_name.trim() !== profile.display_name ||
    current.message_template !== profile.message_template

  function update(field: keyof Draft, value: string) {
    setDraft({ ...current, [field]: value })
    setSaved(false)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!profile) return

    if (current.display_name.trim() === '') {
      setError('Your display name cannot be empty.')
      return
    }

    setSaving(true)

    // Only these two columns are writable by anyone, anywhere: `role` is not
    // granted to the authenticated role at all, so it cannot be changed from
    // the browser however the request is shaped.
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: current.display_name.trim(),
        message_template: current.message_template,
      })
      .eq('id', profile.id)
      .select()
      .maybeSingle()

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    if (!data) {
      setError('That change was refused.')
      return
    }

    setDraft(null)
    setSaved(true)
    // So the header and the WhatsApp message pick up the new values at once.
    refreshProfile()
  }

  const preview = buildMessage(current.message_template, {
    customer: 'Nadia Haddad',
    driver: current.display_name.trim() || profile.display_name,
    address: 'Rue Gouraud, Gemmayzeh, Beirut',
  })

  const inputClass =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:opacity-50'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your name and the message you send customers.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <label className="block text-sm font-medium text-slate-700">
          Display name
          <input
            value={current.display_name}
            onChange={(e) => update('display_name', e.target.value)}
            disabled={saving}
            required
            className={inputClass}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Shown in the header, in the run sheet, and in your WhatsApp
            messages.
          </span>
        </label>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          WhatsApp message
          <textarea
            value={current.message_template}
            onChange={(e) => update('message_template', e.target.value)}
            disabled={saving}
            required
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </label>

        <div className="mt-2 text-xs text-slate-500">
          <p>You can use these, and they are filled in for each delivery:</p>
          <ul className="mt-1 space-y-0.5">
            <li>
              <code className="font-mono">{'{customer}'}</code> — the
              customer&apos;s name
            </li>
            <li>
              <code className="font-mono">{'{driver}'}</code> — your display
              name
            </li>
            <li>
              <code className="font-mono">{'{address}'}</code> — the delivery
              address
            </li>
          </ul>
        </div>

        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Preview</p>
          <p className="mt-1 text-sm text-slate-700">{preview}</p>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !hasChanges}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>

          {hasChanges && (
            <span className="text-sm text-slate-500">Not saved yet.</span>
          )}
          {saved && !hasChanges && (
            <span className="text-sm text-green-700">Settings saved.</span>
          )}
        </div>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="text-slate-500">Signed in as</p>
        <p className="mt-1">{profile.email}</p>
        <p className="mt-3 text-slate-500">Role</p>
        <p className="mt-1">{profile.role}</p>
        <p className="mt-3 text-xs text-slate-400">
          Roles are set by the shop owner in Supabase and cannot be changed
          from here.
        </p>
      </div>
    </div>
  )
}
