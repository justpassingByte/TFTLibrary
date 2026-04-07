import ArticlesPageClient from './ArticlesPageClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function AdminArticlesPage() {
  let articles: any[] = []

  try {
    const res = await fetch(`${API_URL}/api/admin/insights`, { cache: 'no-store' })
    if (res.ok) {
       const data = await res.json()
       articles = data.map((i: any) => ({
          ...i,
          slug: i.id, // assign slug to id so edit and view links work
          author_name: i.author_id || 'Unknown',
       }))
    }
  } catch (e) {}

  return <ArticlesPageClient initialArticles={articles} />
}
