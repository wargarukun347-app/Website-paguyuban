import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut, 
  onAuthStateChanged,
  reload,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { AuthUser, Member, MemberCategory, UserRole } from '../types';
import { sanitizeForFirestore } from './firestoreService';

export interface RegisterMemberParams {
  name: string;
  email: string;
  password: string;
  phone: string;
  category?: MemberCategory;
  address?: string;
  nik?: string;
  notes?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Sanitizes auth error codes into safe, user-friendly, non-leaking Indonesian error messages.
 */
export function formatAuthError(errorCode: string): string {
  switch (errorCode) {
    case 'auth/firebase-app-check-token-is-invalid':
      return 'Firebase App Check sedang aktif/ditegakkan pada Authentication di Firebase Console. Buka Firebase Console > App Check > tab APIs, lalu ubah status Authentication menjadi "Unenforce" (Jangan tegakkan).';
    case 'auth/operation-not-allowed':
      return 'Metode masuk Email & Kata Sandi belum diaktifkan di Firebase Console. Buka Firebase Console > Authentication > Sign-in method, lalu aktifkan penyedia "Email/Password".';
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/user-disabled':
      return 'Akun ini telah dinonaktifkan oleh pengurus.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Email atau kata sandi tidak valid. Silakan periksa kembali.';
    case 'auth/email-already-in-use':
      return 'Alamat email ini sudah terdaftar. Silakan gunakan menu Masuk atau Lupa Kata Sandi.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan masuk yang gagal. Silakan tunggu beberapa saat atau atur ulang kata sandi.';
    case 'auth/network-request-failed':
      return 'Koneksi internet bermasalah. Periksa jaringan Anda dan coba lagi.';
    case 'auth/requires-recent-login':
      return 'Sesi Anda telah kedaluwarsa. Silakan masuk kembali.';
    default:
      return 'Terjadi kendala saat memproses autentikasi. Silakan coba lagi.';
  }
}

/**
 * Fetches user role from Firestore collections (roles_admin & users)
 */
export async function getVerifiedUserRole(uid: string, email: string | null): Promise<UserRole> {
  // 1. Immediate override for hardcoded system administrators
  const adminEmail = email?.toLowerCase().trim();
  const isSpecialAdmin = 
    uid === 'XE5whUp5ANbvNcDenPpdU54RjEF3' ||
    uid === 'pdk76t5xDOPc3uhWeNKPbpiJxFQ2' ||
    uid === 'tgQbLhDht4bAdIu5WhCk4h7idZq1' ||
    adminEmail === 'wargarukun347@gmail.com' || 
    adminEmail === 'admin@kua.id' || 
    adminEmail === 'admin@gmail.com';

  if (isSpecialAdmin) {
    // Admin khusus ditentukan langsung dari UID/email.
    // Jangan menunggu Firestore karena quota/error Firestore
    // tidak boleh mengubah admin menjadi user.
    void setDoc(doc(db, 'roles_admin', uid), {
      uid,
      email: adminEmail || 'admin@kua.id',
      grantedAt: new Date().toISOString(),
      grantedBy: 'system_bootstrap',
    }, { merge: true }).catch((err) => {
      console.warn('Could not bootstrap admin role doc:', err);
    });

    return 'admin';
  }

  try {
    // 2. Check in roles_admin collection
    const adminDoc = await getDoc(doc(db, 'roles_admin', uid));
    if (adminDoc.exists()) {
      return 'admin';
    }

    // 3. Check in users collection
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data?.role === 'admin') {
        return 'admin';
      }
    }

    return 'user';
  } catch (error) {
    console.warn('Error verifying user role from Firestore:', error);
    return 'user';
  }
}


/**
 * Resolve member account -> canonical Member.id.
 *
 * Member.id adalah identitas resmi yang dipakai oleh:
 *   members/{memberId}
 *   payments/{memberId}
 *
 * Firebase Auth UID hanya identitas akun, BUKAN otomatis memberId.
 */
async function resolveCanonicalMember(
  fbUser: FirebaseUser,
  storedMemberId?: string
): Promise<{ memberId?: string; member?: any }> {
  try {
    // Satu-satunya lookup yang dilakukan akun anggota:
    // members/{Member.id} yang sudah diketahui dari users/{uid}.memberId.
    //
    // JANGAN melakukan getDocs(collection(db, 'members'))
    // karena Rules members.list memang admin-only.

    if (!storedMemberId) {
      return {};
    }

    const memberDoc = await getDoc(
      doc(db, 'members', storedMemberId)
    );

    if (!memberDoc.exists()) {
      console.warn(
        `Canonical Member.id ${storedMemberId} tidak ditemukan.`
      );
      return {};
    }

    const member = memberDoc.data() as any;

    // Jika Member sudah memiliki userId, pastikan cocok
    // dengan Firebase UID yang sedang login.
    if (
      member?.userId &&
      member.userId !== fbUser.uid
    ) {
      console.warn(
        `Member.id ${storedMemberId} terhubung ke akun berbeda.`
      );
      return {};
    }

    // Email juga menjadi validasi tambahan bila tersedia.
    const memberEmail =
      typeof member?.email === 'string'
        ? member.email.toLowerCase().trim()
        : '';

    const authEmail =
      typeof fbUser.email === 'string'
        ? fbUser.email.toLowerCase().trim()
        : '';

    if (
      memberEmail &&
      authEmail &&
      memberEmail !== authEmail
    ) {
      console.warn(
        `Email Member.id ${storedMemberId} tidak cocok dengan akun login.`
      );
      return {};
    }

    return {
      memberId: memberDoc.id,
      member,
    };
  } catch (error) {
    console.warn(
      'Could not resolve canonical member:',
      error
    );
  }

  return {};
}

export async function buildAuthUser(fbUser: FirebaseUser): Promise<AuthUser> {
  const role = await getVerifiedUserRole(fbUser.uid, fbUser.email);

  let name =
    fbUser.displayName ||
    (role === 'admin' ? 'Administrator Pengurus' : 'Anggota Paguyuban');

  let memberId: string | undefined;
  let phoneNumber = fbUser.phoneNumber || undefined;

  try {
    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
    const userData = userDoc.exists() ? (userDoc.data() as any) : {};

    if (userData?.phoneNumber) {
      phoneNumber = userData.phoneNumber;
    }

    // Resolve ke Member.id resmi.
    const resolved = await resolveCanonicalMember(
      fbUser,
      userData?.memberId
    );

    if (resolved.memberId) {
      memberId = resolved.memberId;

      // Nama/telepon selalu mengikuti data anggota resmi admin.
      if (resolved.member?.name) {
        name = resolved.member.name;
      }

      if (resolved.member?.phone) {
        phoneNumber = resolved.member.phone;
      }

      // Perbaiki users/{uid} jika memberId lama masih Firebase UID.
      try {
        await setDoc(
          doc(db, 'users', fbUser.uid),
          sanitizeForFirestore({
            id: fbUser.uid,
            memberId: resolved.memberId,
            name: resolved.member?.name || name,
            phoneNumber,
            email: fbUser.email || '',
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      } catch (syncError) {
        console.warn('Could not persist canonical memberId:', syncError);
      }
    } else if (userData?.memberId) {
      memberId = userData.memberId;
      if (userData?.name) name = userData.name;
    } else {
      // Tidak ada Member.id kanonik.
      // Jangan pernah menggunakan Firebase UID sebagai Member.id.
      if (userData?.name) name = userData.name;
      memberId = undefined;
    }
  } catch (e) {
    console.warn('Could not load user/member profile:', e);
    memberId = undefined;
  }

  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    name,
    role,
    memberId,
    phoneNumber,
    emailVerified: fbUser.emailVerified,
    loginTime: new Date().toISOString(),
  };
}

/**
 * Login with Email & Password
 */
export async function loginWithEmailPassword(email: string, password: string): Promise<AuthResponse> {
  const doSignIn = async () => {
    return await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  try {
    let cred;
    try {
      cred = await doSignIn();
    } catch (firstErr: any) {
      const msg = firstErr?.message || '';
      const code = firstErr?.code || '';
      if (
        msg.includes('Database is closing') || 
        msg.includes('closing/hidden') || 
        code === 'auth/internal-error'
      ) {
        // Handle transient IndexedDB connection refresh in iframe/container
        await new Promise((resolve) => setTimeout(resolve, 350));
        cred = await doSignIn();
      } else {
        throw firstErr;
      }
    }

    let authUser: AuthUser;
    try {
      authUser = await buildAuthUser(cred.user);
    } catch (profileErr) {
      console.warn('Profile fetch had an issue, building fallback auth user:', profileErr);
      const cleanEmail = (cred.user.email || email).toLowerCase().trim();
      const isAdmin = 
        cred.user.uid === 'XE5whUp5ANbvNcDenPpdU54RjEF3' || 
        cred.user.uid === 'pdk76t5xDOPc3uhWeNKPbpiJxFQ2' ||
        cred.user.uid === 'tgQbLhDht4bAdIu5WhCk4h7idZq1' ||
        cleanEmail === 'wargarukun347@gmail.com' || 
        cleanEmail === 'admin@kua.id' || 
        cleanEmail === 'admin@gmail.com';
      authUser = {
        id: cred.user.uid,
        email: cred.user.email || email,
        name: cred.user.displayName || (isAdmin ? 'Administrator Pengurus' : 'Anggota Paguyuban'),
        role: isAdmin ? 'admin' : 'user',
        // Jangan menjadikan Firebase UID sebagai Member.id untuk akun lama.
        // buildAuthUser adalah resolver kanonik; fallback hanya sementara.
        memberId: undefined,
        emailVerified: cred.user.emailVerified,
        loginTime: new Date().toISOString(),
      };
    }
    return { success: true, user: authUser };
  } catch (error: any) {
    console.warn('Login error:', error.message || error);
    const code = error.code || '';
    const msg = error.message || '';
    if (msg.includes('Database is closing') || msg.includes('closing/hidden')) {
      return {
        success: false,
        error: 'Sesi browser sedang memperbarui koneksi database. Silakan klik tombol Masuk sekali lagi.',
      };
    }
    return { 
      success: false, 
      error: formatAuthError(code) 
    };
  }
}

/**
 * Register a new Member account (Public registration only creates 'user' role)
 */
export async function registerMember(params: RegisterMemberParams): Promise<AuthResponse> {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.name.trim();

    // 1. Create auth user with Firebase Authentication
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
    const fbUser = cred.user;

    // 2. Send Email Verification
    try {
      await sendEmailVerification(fbUser);
    } catch (verifErr) {
      console.warn('Could not send email verification immediately:', verifErr);
    }

    // 3. Create member entry in Firestore `members` collection
    const memberId = fbUser.uid;
    const newMember: Member = {
      id: memberId,
      no: Date.now() % 10000,
      name: cleanName,
      category: params.category || 'P3N',
      phone: params.phone.trim(),
      address: params.address?.trim() || 'Kec. Kedungbanteng, Kab. Banyumas',
      status: 'Aktif',
      isArisanParticipant: true,
      isIuranParticipant: true,
      joinDate: new Date().toISOString().split('T')[0],
      nik: params.nik?.trim(),
      notes: params.notes?.trim() || 'Terdaftar melalui Portal Anggota Mandiri',
    };

    // Save member doc
    await setDoc(doc(db, 'members', memberId), sanitizeForFirestore({
      ...newMember,
      userId: fbUser.uid,
      email: cleanEmail,
    }), { merge: true });

    // 4. Create user profile in `users` collection (admin for designated admin email, user for members)
    const isSpecialAdmin = fbUser.uid === 'pdk76t5xDOPc3uhWeNKPbpiJxFQ2' ||
    fbUser.uid === 'tgQbLhDht4bAdIu5WhCk4h7idZq1' ||
    fbUser.uid === 'XE5whUp5ANbvNcDenPpdU54RjEF3' || cleanEmail === 'wargarukun347@gmail.com' || cleanEmail === 'admin@kua.id' || cleanEmail === 'admin@gmail.com';
    const assignedRole: UserRole = isSpecialAdmin ? 'admin' : 'user';

    await setDoc(doc(db, 'users', fbUser.uid), sanitizeForFirestore({
      id: fbUser.uid,
      email: cleanEmail,
      name: cleanName,
      role: assignedRole,
      memberId: memberId,
      phoneNumber: params.phone.trim(),
      emailVerified: fbUser.emailVerified,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (isSpecialAdmin) {
      try {
        await setDoc(doc(db, 'roles_admin', fbUser.uid), {
          uid: fbUser.uid,
          email: cleanEmail,
          grantedAt: new Date().toISOString(),
          grantedBy: 'system_admin_initiation',
        }, { merge: true });
      } catch (err) {
        console.warn('Could not set roles_admin doc during registration:', err);
      }
    }

    const authUser: AuthUser = {
      id: fbUser.uid,
      email: cleanEmail,
      name: cleanName,
      role: assignedRole,
      memberId: memberId,
      phoneNumber: params.phone.trim(),
      emailVerified: fbUser.emailVerified,
      loginTime: new Date().toISOString(),
    };

    return { success: true, user: authUser };
  } catch (error: any) {
    console.warn('Registration error:', error.message || error);
    return { 
      success: false, 
      error: formatAuthError(error.code || '') 
    };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      success: true,
      message: `Tautan reset kata sandi telah dikirim ke alamat email ${cleanEmail}. Silakan periksa kotak masuk atau folder spam Anda.`,
    };
  } catch (error: any) {
    console.warn('Password reset error:', error.message || error);
    return {
      success: false,
      message: formatAuthError(error.code || ''),
      error: error.message,
    };
  }
}

/**
 * Resend verification email to current user
 */
export async function resendVerificationEmail(): Promise<{ success: boolean; message: string }> {
  if (!auth.currentUser) {
    return { success: false, message: 'Tidak ada sesi pengguna aktif.' };
  }

  try {
    await sendEmailVerification(auth.currentUser);
    return { 
      success: true, 
      message: 'Email verifikasi berhasil dikirim ulang! Silakan periksa kotak masuk atau spam email Anda.' 
    };
  } catch (error: any) {
    console.warn('Error sending verification email:', error.message || error);
    return { 
      success: false, 
      message: formatAuthError(error.code || '') 
    };
  }
}

/**
 * Refresh current user's email verification status
 */
export async function refreshEmailVerificationStatus(): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    await reload(auth.currentUser);
    return auth.currentUser.emailVerified;
  } catch (err) {
    console.warn('Error refreshing auth token status:', err);
    return false;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

/**
 * Listen to auth state changes
 */
export function subscribeToAuthChanges(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null);
      return;
    }

    // Admin khusus harus tetap ADMIN walaupun Firestore sedang
    // quota exceeded atau tidak dapat diakses.
    const fallbackEmail = (fbUser.email || '').toLowerCase().trim();
    const isSpecialAdmin =
      fbUser.uid === 'XE5whUp5ANbvNcDenPpdU54RjEF3' ||
      fbUser.uid === 'pdk76t5xDOPc3uhWeNKPbpiJxFQ2' ||
      fbUser.uid === 'tgQbLhDht4bAdIu5WhCk4h7idZq1' ||
      fallbackEmail === 'wargarukun347@gmail.com' ||
      fallbackEmail === 'admin@kua.id' ||
      fallbackEmail === 'admin@gmail.com';

    const fallbackUser: AuthUser = {
      id: fbUser.uid,
      email: fbUser.email || '',
      name: isSpecialAdmin
        ? 'Administrator Pengurus'
        : (fbUser.displayName || 'Anggota Paguyuban'),
      role: isSpecialAdmin ? 'admin' : 'user',
      // Jangan menyamakan Auth UID dengan Member.id.
      // Resolver utama akan menentukan Member.id kanonik.
      memberId: undefined,
      phoneNumber: fbUser.phoneNumber || undefined,
      emailVerified: fbUser.emailVerified,
      loginTime: new Date().toISOString(),
    };

    try {
      const authUser = await Promise.race([
        buildAuthUser(fbUser),
        new Promise<AuthUser>((resolve) =>
          setTimeout(() => resolve(fallbackUser), 5000)
        ),
      ]);

      callback(authUser);
    } catch (error) {
      console.warn('Auth profile loading failed, using Firebase Auth fallback:', error);
      callback(fallbackUser);
    }
  });
}
