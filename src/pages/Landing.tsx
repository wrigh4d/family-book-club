import {type FormEvent, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {Brand, Button, Card, ErrorBanner, Field, NameForm, Page, TextInput} from '../components/ui'
import {useAuth} from '../lib/auth'
import {normalizeClubCode} from '../lib/codes'
import {friendlyFirebaseError} from '../lib/errors'
import {createClub, joinClub} from '../lib/store'

export function Landing() {
    const {uid, displayName, ready, error, setDisplayName} = useAuth()
    const navigate = useNavigate()
    const [localError, setLocalError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    async function withName(action: (name: string) => Promise<void>, name?: string) {
        if (!uid) return
        setLocalError(null)
        setBusy(true)
        try {
            const resolved = (name ?? displayName ?? '').trim()
            if (!resolved) throw new Error('Enter your name first.')
            if (!displayName) await setDisplayName(resolved)
            await action(resolved)
        } catch (err) {
            setLocalError(friendlyFirebaseError(err))
        } finally {
            setBusy(false)
        }
    }

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const clubName = String(data.get('clubName') ?? '')
        await withName(async (name) => {
            if (!uid) return
            const code = await createClub(clubName, uid, name)
            navigate(`/club/${code}`)
        })
    }

    async function handleJoin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const code = normalizeClubCode(String(data.get('code') ?? ''))
        if (code.length < 4) {
            setLocalError('Enter the club code.')
            return
        }
        await withName(async (name) => {
            if (!uid) return
            await joinClub(code, uid, name)
            navigate(`/club/${code}`)
        })
    }

    return (
        <Page>
            <header className="flex flex-col gap-2">
                <Brand/>
                <h1 className="font-display text-4xl leading-tight">Pick a book the whole family will actually
                    read.</h1>
                <p className="text-ink/80">
                    Create a club, share a code, add rules and nominations, then present the next pick when you meet.
                </p>
            </header>

            <ErrorBanner message={error ?? localError}/>

            {!ready ? (
                <p>Getting you in…</p>
            ) : !displayName ? (
                <Card>
                    <h2 className="mb-3 font-display text-2xl">What should we call you?</h2>
                    <NameForm onSave={(name) => withName(async () => undefined, name)}/>
                </Card>
            ) : (
                <>
                    <p className="text-sm text-ink/70">
                        Signed in as <span className="font-semibold text-ink">{displayName}</span>
                    </p>
                    <Card>
                        <h2 className="mb-3 font-display text-2xl">Create a club</h2>
                        <form className="flex flex-col gap-3" onSubmit={handleCreate}>
                            <Field label="Club name">
                                <TextInput name="clubName" placeholder="Sunday readers" required/>
                            </Field>
                            <Button type="submit" disabled={busy}>
                                Create club
                            </Button>
                        </form>
                    </Card>
                    <Card>
                        <h2 className="mb-3 font-display text-2xl">Join a club</h2>
                        <form className="flex flex-col gap-3" onSubmit={handleJoin}>
                            <Field label="Club code">
                                <TextInput
                                    name="code"
                                    placeholder="AB3K7Q"
                                    autoCapitalize="characters"
                                    required
                                />
                            </Field>
                            <Button type="submit" variant="secondary" disabled={busy}>
                                Join
                            </Button>
                        </form>
                    </Card>
                </>
            )}
        </Page>
    )
}
