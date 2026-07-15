/**
 * Blog article route.
 *
 * The article renderer still lives under app/news/[slug] so this overhaul does
 * not have to rewrite 18 KB of Tiptap and legacy block rendering in the same
 * pass. /news and /news/:slug redirect to /blog in next.config.mjs, so this is
 * the only reachable path for an article.
 *
 * Route segment config must be declared literally here: Next.js parses these
 * statically at compile time and rejects them when re-exported.
 *
 * Follow up: move the renderer into this file and delete app/news entirely.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export { generateMetadata, default } from '../../news/[slug]/page'
