import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'

export type CollectionItem = {
  id?: string
  title: string
  category: string
  description: string
  icon: string
}

const collectionsRef = collection(db, 'collections')

export async function getCollections(): Promise<CollectionItem[]> {
  const snapshot = await getDocs(collectionsRef)

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<CollectionItem, 'id'>),
  }))
}

export async function addCollection(
  data: Omit<CollectionItem, 'id'>,
) {
  return addDoc(collectionsRef, data)
}

export async function updateCollection(
  id: string,
  data: Partial<Omit<CollectionItem, 'id'>>,
) {
  return updateDoc(doc(db, 'collections', id), data)
}

export async function deleteCollection(id: string) {
  return deleteDoc(doc(db, 'collections', id))
}
