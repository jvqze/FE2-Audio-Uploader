import { useSession } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FaExclamationCircle } from 'react-icons/fa';

const isValidAudioUrl = (url: string) => {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'cdn.jaylen.nyc';
    } catch {
        return false;
    }
};

export default function AudioStudio() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { file } = router.query;

    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioTitle, setAudioTitle] = useState<string>('');
    const [isPublic, setIsPublic] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [canPublish, setCanPublish] = useState<boolean>(true);

    useEffect(() => {
        if (typeof file === 'string' && isValidAudioUrl(file)) {
            setAudioUrl(file);
            setErrorMessage(null);
            console.log('Found file:', file);

            fetch(`/api/audios/modifyFile?audioUrl=${file}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                },
            })
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 404) {
                            setCanPublish(false);
                            setErrorMessage(response.statusText);
                        } else {
                            setCanPublish(false);
                            setErrorMessage(response.statusText);
                        }
                    }
                    return response.json();
                })
                .then(data => {
                    setAudioTitle(data.title);
                    setIsPublic(data.public);
                    document.title = `Editing ${data.title} - Audio Studio`;
                })
                .catch(error => {
                    console.error('Error fetching audio details:', error);
                    setErrorMessage(error.message);
                });
        } else {
            console.error('Invalid audio URL.');
            setErrorMessage('Invalid audio URL. Please check the link and try again.');
        }
    }, [file, session]);

    const handleUpdateDetails = async () => {
        if (!audioUrl || !session?.user?.email) return;

        if (canPublish == false) {
            return setErrorMessage('You cannot publish a file that is not yours');
        }

        try {
            const response = await fetch('/api/audios/modifyFile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify({
                    userId: session?.user?.email,
                    patchAudioLink: audioUrl,
                    title: audioTitle,
                    public: isPublic,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                setErrorMessage(`Error updating audio details: ${errorText}`);
                return;
            }

            const data = await response.json();
            if (data.success) {
                setErrorMessage(null);
                alert('Audio details updated successfully!');
            } else {
                setErrorMessage('Failed to update audio details. Please try again.');
            }
        } catch (error) {
            console.error('Error updating audio details:', error);
            setErrorMessage('An error occurred while updating the audio details.');
        }
    };

    if (status === 'loading') {
        return (
            <p className="text-white">
                Audio not valid, please go back to the main page and find the correct audio
            </p>
        );
    }

    if (!session) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-white">
                <Head>
                    <title>Unauthorized</title>
                </Head>
                <h1 className="mb-2 text-3xl font-extrabold">Audio Studio</h1>
                <p className="text-sm text-gray-400">Unauthorized</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center text-white">
            <Head>
                <title>{audioUrl}</title>
            </Head>
            <h1 className="mb-6 text-4xl font-bold">Audio Studio</h1>
            <p className="mb-4 text-gray-400">
                Trim, offset, and manage your audio files with ease.
            </p>

            {errorMessage && (
                <div className="mb-4 flex items-center rounded bg-red-600 p-3 text-white">
                    <FaExclamationCircle className="mr-2" />
                    {errorMessage}
                </div>
            )}

            {audioUrl ? (
                <>
                    <audio
                        controls
                        src={audioUrl}
                        className="my-4 w-full max-w-md rounded-lg shadow-lg"
                    >
                        Your browser does not support the audio element.
                    </audio>

                    <div className="w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="audio-title" className="text-gray-200">
                                Audio Title
                            </label>
                            <input
                                type="text"
                                id="audio-title"
                                value={audioTitle}
                                className="w-48 rounded bg-[#1f293798] p-2 text-white"
                                onChange={e => setAudioTitle(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label htmlFor="audio-publicity" className="text-gray-200">
                                Publicity
                            </label>
                            <button
                                onClick={() => setIsPublic(!isPublic)}
                                className={`w-24 rounded py-2 ${
                                    isPublic ? 'bg-red-600' : 'bg-green-600'
                                } text-white`}
                            >
                                {isPublic ? 'Private' : 'Public'}
                            </button>
                        </div>

                        <button
                            onClick={handleUpdateDetails}
                            className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-center font-semibold text-white hover:bg-blue-500"
                        >
                            Update Audio Details
                        </button>
                    </div>
                </>
            ) : (
                <p className="text-gray-400">
                    No valid audio file provided. Please check the URL and try again.
                </p>
            )}
        </div>
    );
}
