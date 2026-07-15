/**
 * Blog article route.
 *
 * The article renderer still lives under app/news/[slug] so this overhaul does
 * not have to rewrite 18 KB of Tiptap and legacy block rendering in the same
 * pass. /news and /news/:slug redirect to /blog in next.config.mjs, so this is
 * the only reachable path for an article.
 *
 * Follow up: move the renderer into this file and delete app/news entirely.
 */
export { dynamic, revalidate, generateMetadata, default } from '../../news/[slug]/page'
