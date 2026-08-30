export function firebaseErrorCode(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        return String((error as {code: unknown}).code)
    }
    return ''
}

export function shouldFallbackToGoogleRedirect(code: string): boolean {
    return (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
    )
}

export function friendlyFirebaseError(error: unknown): string {
    const code = firebaseErrorCode(error)
    const message =
        typeof error === 'object' && error !== null && 'message' in error
            ? String((error as {message: unknown}).message)
            : ''

    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        return 'Google sign-in is not enabled yet. In Firebase: Authentication → Sign-in method → Google → Enable.'
    }
    if (code === 'auth/unauthorized-domain') {
        return 'This site is not an authorized domain. In Firebase: Authentication → Settings → Authorized domains, add localhost and your GitHub Pages host (YOUR_USERNAME.github.io).'
    }
    if (code === 'auth/popup-blocked') {
        return 'The sign-in popup was blocked. Allow popups for this site, or try again.'
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return 'Sign-in was cancelled.'
    }
    if (code === 'auth/account-exists-with-different-credential') {
        return 'That email is already used with a different sign-in method.'
    }
    if (
        code === 'failed-precondition' ||
        code === 'unimplemented' ||
        /the client is offline/i.test(message) ||
        /404/i.test(message)
    ) {
        return 'Firestore is not created yet. In Firebase: Build → Firestore Database → Create database → start in test mode.'
    }
    if (code === 'permission-denied' || /insufficient permissions/i.test(message)) {
        return 'Firestore blocked this action. Publish the rules from firestore.rules in this repo (Firebase → Firestore → Rules → Publish). Local and GitHub Pages use the same database.'
    }
    if (message) return message
    return 'Something went wrong. Try again.'
}
