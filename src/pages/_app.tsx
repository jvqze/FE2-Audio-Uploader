import '../styles/globals.css';

import { SessionProvider } from 'next-auth/react';
import { AppProps } from 'next/app';
import Link from 'next/link';

import AccountProfile from '../components/Account';

export default function App({
    Component,
    pageProps: { session, ...pageProps },
}: AppProps): JSX.Element {
    return (
        <SessionProvider session={session}>
            <nav className="flex items-center justify-between bg-black p-4 text-white shadow-md">
                <h1 className="hidden text-2xl font-semibold md:block">FE2 Audio Uploader</h1>
                <div className="flex items-center space-x-3">
                    <Link
                        href="/"
                        className="relative transform rounded-md bg-blue-800 px-4 py-2 text-lg font-medium shadow-lg shadow-blue-500/50 transition duration-300 ease-in-out hover:scale-105 hover:bg-blue-500 hover:shadow-none"
                    >
                        Home
                        <span className="absolute inset-0 rounded-md bg-gradient-to-r from-pink-500 to-purple-500 opacity-30 blur-xl"></span>
                    </Link>
                    <Link
                        href="/audios"
                        className="relative transform rounded-md bg-green-600 px-4 py-2 text-lg font-medium shadow-lg shadow-green-500/50 transition duration-300 ease-in-out hover:scale-105 hover:bg-green-500 hover:shadow-none"
                    >
                        Audios
                        <span className="absolute inset-0 rounded-md bg-gradient-to-r from-pink-500 to-purple-500 opacity-30 blur-xl"></span>
                    </Link>
                    <Link
                        href="/profiles"
                        className="relative transform rounded-md bg-indigo-600 px-4 py-2 text-lg font-medium shadow-lg shadow-indigo-500/50 transition duration-300 ease-in-out hover:scale-105 hover:bg-indigo-500 hover:shadow-none"
                    >
                        Profiles
                        <span className="absolute inset-0 rounded-md bg-gradient-to-r from-pink-500 to-purple-500 opacity-30 blur-xl"></span>
                    </Link>
                    <AccountProfile />
                </div>
            </nav>
            <Component {...pageProps} />
            <footer className="mt-8 bg-black py-4 text-center text-white">
                <div className="flex justify-center space-x-4">
                    <Link href="/legal/terms" className="text-sm text-gray-400 hover:underline">
                        Terms of Service
                    </Link>
                    <Link href="/legal/policy" className="text-sm text-gray-400 hover:underline">
                        Privacy Policy
                    </Link>
                    <Link href="https://github.com/jvqze/FE2-Audio-Uploader" className="text-sm text-gray-400 hover:underline">
                        GitHub
                    </Link>
                </div>
                <p className="mt-2 text-xs text-gray-500">Made with 💖 By Jaylen</p>
            </footer>
        </SessionProvider>
    );
}
