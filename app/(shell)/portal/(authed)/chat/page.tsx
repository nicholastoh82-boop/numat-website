/*
  app/portal/(authed)/chat/page.tsx

  The portal authed layout already runs requirePortalUser, so this page is
  only reachable by signed in portal users. It renders the client chat.
*/

import ChatClient from './_components/ChatClient'

export const metadata = {
  title: 'Team Chat',
  robots: 'noindex, nofollow',
}

export default function TeamChatPage() {
  return <ChatClient />
}
