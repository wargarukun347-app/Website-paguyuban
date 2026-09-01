import { useEffect, useState } from 'react'
import './App.css'
import {
  addCollection,
  getCollections,
  type CollectionItem,
} from './lib/firestoreService'

const initialCollections: Omit<CollectionItem, 'id'>[] = [
  {
    title: 'Star Collection One',
    category: 'Featured',
    description: 'Koleksi unggulan Star Collection.',
    icon: '⭐',
  },
  {
    title: 'Star Collection Two',
    category: 'Popular',
    description: 'Koleksi populer yang banyak dilihat.',
    icon: '🌟',
  },
  {
    title: 'Star Collection Three',
    category: 'New',
    description: 'Koleksi terbaru yang baru ditambahkan.',
    icon: '✨',
  },
]

function App() {
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCollections = async () => {
      try {
        setLoading(true)
        setError('')

        let data = await getCollections()

        if (data.length === 0) {
          await Promise.all(
            initialCollections.map((item) => addCollection(item)),
          )

          data = await getCollections()
        }

        setCollections(data)
      } catch (err) {
        console.error('Firestore error:', err)
        setError(
          'Data collection belum dapat dimuat. Periksa koneksi Firebase dan Firestore.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadCollections()
  }, [])

  const filteredCollections = collections.filter((item) =>
    `${item.title} ${item.category} ${item.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-star">⭐</div>
          <div>
            <strong>STAR COLLECTION</strong>
            <span>Digital Collection</span>
          </div>
        </div>

        <nav>
          <a href="#home">Home</a>
          <a href="#collection">Collection</a>
          <a href="#about">About</a>
          <button className="login-button">Login</button>
        </nav>
      </header>

      <main>
        <section id="home" className="hero-section">
          <div className="hero-content">
            <span className="eyebrow">WELCOME TO STAR COLLECTION</span>

            <h1>
              Discover Your
              <br />
              <span>Collection.</span>
            </h1>

            <p>
              Temukan, kelola, dan nikmati koleksi Anda dalam satu tempat
              digital yang modern dan mudah digunakan.
            </p>

            <div className="hero-actions">
              <a href="#collection" className="primary-button">
                ⭐ Lihat Collection
              </a>

              <a href="#about" className="secondary-button">
                Pelajari Lebih Lanjut
              </a>
            </div>
          </div>

          <div className="hero-art">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <div className="hero-star">⭐</div>
            <div className="floating-star star-one">✦</div>
            <div className="floating-star star-two">✧</div>
            <div className="floating-star star-three">✦</div>
          </div>
        </section>

        <section id="collection" className="collection-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPLORE</span>
              <h2>Our Collection</h2>
              <p>Jelajahi koleksi yang tersedia.</p>
            </div>

            <div className="search-box">
              <span>🔍</span>
              <input
                type="search"
                placeholder="Cari collection..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {loading && (
            <div className="empty-state">
              <span>⏳</span>
              <h3>Memuat collection...</h3>
              <p>Mengambil data dari Firebase Firestore.</p>
            </div>
          )}

          {error && (
            <div className="empty-state">
              <span>⚠️</span>
              <h3>Terjadi masalah</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="collection-grid">
              {filteredCollections.map((item) => {
                const isFavorite = item.id
                  ? favorites.includes(item.id)
                  : false

                return (
                  <article className="collection-card" key={item.id}>
                    <div className="collection-image">
                      <span>{item.icon}</span>

                      {item.id && (
                        <button
                          className={`favorite-button ${
                            isFavorite ? 'active' : ''
                          }`}
                          onClick={() => toggleFavorite(item.id!)}
                          aria-label={
                            isFavorite
                              ? 'Hapus dari favorit'
                              : 'Tambah ke favorit'
                          }
                        >
                          {isFavorite ? '★' : '☆'}
                        </button>
                      )}
                    </div>

                    <div className="collection-info">
                      <span className="category">{item.category}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>

                      <button className="detail-button">
                        View Detail →
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!loading && !error && filteredCollections.length === 0 && (
            <div className="empty-state">
              <span>🔎</span>
              <h3>Collection tidak ditemukan</h3>
              <p>Coba gunakan kata pencarian yang berbeda.</p>
            </div>
          )}
        </section>

        <section id="about" className="about-section">
          <div>
            <span className="eyebrow">ABOUT STAR COLLECTION</span>
            <h2>Satu tempat untuk semua koleksi Anda.</h2>
          </div>

          <p>
            Star Collection dirancang sebagai platform digital untuk
            menyimpan, mengelola, mencari, dan menikmati koleksi dengan
            pengalaman yang sederhana serta nyaman di perangkat desktop
            maupun mobile.
          </p>
        </section>
      </main>

      <footer>
        <div className="brand">
          <div className="brand-star">⭐</div>
          <strong>STAR COLLECTION</strong>
        </div>

        <p>© 2026 Star Collection. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
