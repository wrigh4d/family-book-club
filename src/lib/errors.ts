export function friendlyFirebaseError(error: unknown): string {
    const code =
        typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code: unknown }).code)
            : ''
    const message =
        typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : ''

    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        return 'Anonymous sign-in is not enabled yet. In Firebase: Authentication → Sign-in method → Anonymous → Enable.'
    }
    if (
        code === 'failed-precondition' ||
        code === 'unimplemented' ||
        /the client is offline/i.test(message) ||
        /404/i.test(message)
    ) {
        return 'Firestore is not created yet. In Firebase: Build → Firestore Database → Create database → start in test mode.'
    }
    if (message) return message
    return 'Something went wrong. Try again.'
}
