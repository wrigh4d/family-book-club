import { initializeApp } from 'firebase/app'
import { getMessaging } from 'firebase/messaging/sw'
import { firebaseConfig } from './lib/firebaseConfig'

initializeApp(firebaseConfig)

// Instantiating messaging registers the push handler. A notification payload is
// shown by that handler, and its click opens the link stored on the message.
getMessaging()
