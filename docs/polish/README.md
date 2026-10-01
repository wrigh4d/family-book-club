# Polish screenshots

Mobile (~390×844 @2x) captures for PR #1 (`polish/pwa-feel`).

| File | Screen |
|------|--------|
| `00-main-landing-contrast.svg` | Main deploy Landing (no install hint) |
| `01-landing-install-hint.svg` | Branch Landing + InstallHint (live preview) |
| `02-loading-pulse.svg` | LoadingState pulse (illustrative) |
| `03-club-tab-bar.svg` | Club tab bar + safe areas (illustrative; auth-gated) |
| `04-chat-composer.svg` | Chat composer sticky bar (illustrative; auth-gated) |
| `05-present-header-notch.svg` | Present header notch safe-area (illustrative; auth-gated) |

**Auth note:** Club tab bar, chat, and Present require Firebase Google sign-in. Those three shots are UI mocks matching the polished markup/classes. Landing + install hint are from the real branch preview.

**Present.tsx status:** Full Present with notch polish is ready locally. Remote Present is temporarily a stub after an accidental overwrite; restore by pushing local `src/pages/Present.tsx`.
