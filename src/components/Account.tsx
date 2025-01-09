import { signIn, signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

export default function AccountButton() {
    const { data: session } = useSession();

    return (
        <div className="relative flex items-center">
            {session ? (
                <div className="group relative">
                    <button
                        onClick={() => signOut()}
                        className="rounded-full bg-neutral-800 p-1 shadow-md hover:bg-neutral-700"
                    >
                        {session.user?.image && (
                            <Image
                                width={50}
                                height={50}
                                src={session.user.image}
                                alt="User Avatar"
                                className="rounded-full"
                            />
                        )}
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => signIn('discord')}
                    className="flex items-center justify-center space-x-3 rounded bg-blue-600 px-4 py-2 text-sm text-white shadow-lg transition hover:bg-blue-700"
                >
                    <span>Authorize with Discord</span>
                </button>
            )}
        </div>
    );
}
