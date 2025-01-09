import Head from 'next/head';
import { useEffect, useState } from 'react';

interface Upload {
    title: string;
    audioLink: string;
    createdAt: string;
    private: boolean;
}

interface Profile {
    username: string;
    uploads: Upload[];
    userID: string;
}

export default function Home(): JSX.Element {
    const [audioList, setAudioList] = useState<
        {
            title: string;
            audioLink: string;
            createdAt: string;
            uploader: string;
            uploaderID: string;
        }[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAudioList = async () => {
            try {
                const response = await fetch('/api/audios/fetchallaudios');
                if (!response.ok) {
                    throw new Error('Failed to fetch audio data');
                }

                const profiles = await response.json();
                const audios = profiles
                    .flatMap((profile: Profile) =>
                        profile.uploads
                            .filter((upload: Upload) => !upload.private)
                            .map((upload: Upload) => ({
                                title: upload.title || 'Untitled',
                                audioLink: upload.audioLink,
                                createdAt: upload.createdAt,
                                uploader: profile.username || 'Anonymous',
                                uploaderID: profile.userID,
                            })),
                    )
                    .sort(
                        (
                            a: { createdAt: string | number | Date },
                            b: { createdAt: string | number | Date },
                        ) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    );
                setAudioList(audios);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError(String(err));
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAudioList();
    }, []);

    if (loading) {
        return <p>Loading...</p>;
    }

    if (error) {
        return <p>Error: {error}</p>;
    }

    return (
        <main>
            <Head>
                <title>Public Audio List</title>
            </Head>
            <div className="mx-auto max-w-6xl p-6">
                <h1 className="mb-6 text-center text-3xl font-bold">Public Audio List</h1>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {audioList.map((audio, index) => (
                        <div
                            key={index}
                            className="transform rounded-lg bg-[#31313baf] p-4 shadow-lg transition-transform hover:scale-105"
                        >
                            <h2 className="truncate text-xl font-semibold">{audio.title}</h2>
                            <p className="text-white">
                                Uploaded by:{' '}
                                <a
                                    href={`https://fe2.jaylen.nyc/profiles/${audio.uploaderID}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 underline"
                                >
                                    {audio.uploader}
                                </a>
                            </p>
                            <p className="text-sm text-gray-400">
                                Uploaded on: {new Date(audio.createdAt).toLocaleDateString()}
                            </p>
                            <audio
                                controls
                                src={audio.audioLink}
                                className="mt-4 w-full rounded-lg"
                            >
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
