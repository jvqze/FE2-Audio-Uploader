import { signIn, useSession } from 'next-auth/react';
import Head from 'next/head';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { FaCheckCircle, FaCopy, FaEdit, FaList, FaSearch, FaTrash, FaUpload } from 'react-icons/fa';

import Modal from '../components/Modal';

const uploadDomain = 'cdn.jaylen.nyc';

function Notification({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
    const backgroundColor =
        type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-gray-600';

    return (
        <div
            className={`${backgroundColor} fixed bottom-4 right-4 z-50 rounded-lg p-4 text-white shadow-lg transition-all`}
        >
            {message}
        </div>
    );
}

export default function Page(): JSX.Element {
    const { data: session } = useSession();
    const [isCopied, setIsCopied] = useState<{ [key: string]: boolean }>({});
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [showModal, setShowModal] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<
        Array<{ link: string; name: string; createdAt: string }>
    >([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
    } | null>(null);
    const [compactView, setCompactView] = useState(false);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isValidAudio =
            file.type === 'audio/mp3' || file.type === 'audio/mpeg' || file.type === 'audio/ogg';
        if (!isValidAudio) {
            setNotification({ message: 'Please upload a valid .mp3 or .ogg file.', type: 'error' });
            return;
        }

        if (!session) {
            setNotification({ message: 'You must be logged in to upload a file.', type: 'error' });
            return;
        }
        setShowModal(true);
    };

    const handleModalConfirm = (isFilePrivate: boolean, title: string) => {
        setShowModal(false);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput?.files) {
            handleUpload(fileInput.files[0], isFilePrivate, title);
        }
    };

    const handleUpload = async (file: File, isPrivate: boolean, title: string) => {
        setIsUploading(true);
        let tixteApiKey: string;

        try {
            const response = await fetch('/api/getKey');
            if (!response.ok) throw new Error('Failed to get Tixte API key');
            const { tixteApiKey: apiKey } = await response.json();
            tixteApiKey = atob(apiKey);
        } catch (error) {
            setNotification({
                message: `Error fetching upload configuration. ${error}`,
                type: 'error',
            });
            setIsUploading(false);
            return;
        }

        const formData = new FormData();
        const payloadJson = JSON.stringify({
            domain: uploadDomain,
            name: file.name,
        });
        formData.append('payload_json', payloadJson);
        formData.append('file', file);

        try {
            const res = await fetch('https://api.tixte.com/v1/upload', {
                method: 'POST',
                headers: {
                    Authorization: tixteApiKey,
                },
                body: formData,
            });

            if (!res.ok) {
                setNotification({ message: 'Upload failed. Please try again.', type: 'error' });
                setIsUploading(false);
                return;
            }

            const result = await res.json();
            if (result.success) {
                setNotification({ message: 'File uploaded successfully!', type: 'success' });
                await saveToMongoose(
                    result.data.direct_url,
                    title,
                    isPrivate,
                    result.data.deletion_url,
                );

                try {
                    navigator.clipboard.writeText(result.data.direct_url);
                    setNotification({ message: 'URL copied to clipboard!', type: 'success' });
                } catch (error) {
                    console.error("User wasn't focused on window, not copied to clipboard", error);
                }
            } else {
                setNotification({ message: 'Upload failed. Please try again.', type: 'error' });
            }
        } catch (error) {
            console.log(error);
            setNotification({ message: `${error}`, type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteFile = async (audioLink: string) => {
        if (!session) {
            setNotification({
                message: 'You must be logged in to delete files.',
                type: 'error',
            });
            return;
        }

        try {
            const res = await fetch('/api/audios/modifyFile', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify({ audioLink }),
            });

            if (!res.ok) throw new Error('Failed to delete file.');

            setNotification({ message: 'File deleted successfully!', type: 'success' });
            setUploadedFiles(prevFiles => prevFiles.filter(file => file.link !== audioLink));
        } catch (error) {
            setNotification({
                message: `${error}`,
                type: 'error',
            });
        }
    };

    const saveToMongoose = async (
        fileUrl: string,
        title: string,
        isPrivate: boolean,
        deletion_url: string,
    ) => {
        try {
            const res = await fetch('/api/audios/modifyFile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify({
                    userid: session?.user?.email,
                    audioLink: fileUrl,
                    title: title,
                    private: isPrivate,
                    deletion_url: deletion_url,
                    createdAt: new Date(),
                }),
            });

            if (!res.ok) throw new Error('Failed to save file to database');
        } catch (error) {
            setNotification({
                message: `We ran into some problem saving it to database. ${error}`,
                type: 'error',
            });
        }
    };

    const fetchUploadedFiles = useCallback(async () => {
        if (session) {
            try {
                const res = await fetch(`/api/audios/getFiles?userid=${session.user?.email}`);
                if (res.ok) {
                    const files = await res.json();
                    setUploadedFiles(
                        files.map(
                            (file: {
                                name: string;
                                link: string;
                                createdAt: string;
                                deletion_url: string;
                            }) => ({
                                name: file.name,
                                link: file.link,
                                createdAt: file.createdAt,
                                deletion_url: file.deletion_url,
                            }),
                        ),
                    );
                } else {
                    console.error('Error fetching uploaded files:', res.statusText);
                }
            } catch (error) {
                console.error('Error fetching uploaded files:', error);
            }
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            fetchUploadedFiles();
        }
    }, [session, fetchUploadedFiles]);

    const handleCopyToClipboard = (fileLink: string, index: number) => {
        navigator.clipboard.writeText(fileLink).then(() => {
            setIsCopied(prev => ({ ...prev, [index]: true }));
            setTimeout(() => {
                setIsCopied(prev => ({ ...prev, [index]: false }));
            }, 1500);
        });
    };

    const filteredFiles = uploadedFiles
        .filter(file => file.name?.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 text-white">
            <Head>
                <title>FE2 Audio Uploader</title>
            </Head>

            {session && (
                <>
                    <div className="relative flex items-center space-x-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <div
                                className={`flex items-center justify-center space-x-2 rounded-lg p-3 shadow-lg transition ${isUploading ? 'cursor-not-allowed bg-gray-800' : 'bg-gray-600 hover:bg-gray-700'}`}
                            >
                                <FaUpload size={20} />
                                <span>Upload</span>
                            </div>
                        </label>
                        <input
                            type="file"
                            accept=".mp3, .ogg"
                            id="file-upload"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={isUploading}
                        />
                        <button
                            onClick={() => setCompactView(!compactView)}
                            className="flex items-center space-x-2 rounded-lg bg-gray-600 p-3 shadow-lg transition hover:bg-gray-700"
                        >
                            <FaList size={20} />
                            <span>{compactView ? 'Grid' : 'Compact'}</span>
                        </button>
                    </div>

                    {showModal && (
                        <Modal onClose={() => setShowModal(false)} onConfirm={handleModalConfirm} />
                    )}

                    <div className="mt-5 w-full max-w-6xl space-y-8 rounded-lg bg-[#26262693] p-8 shadow-2xl">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search files..."
                                className="w-full rounded-md bg-black p-3 pl-10 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <FaSearch className="absolute left-3 top-3 text-gray-400" size={20} />
                        </div>

                        <div className={compactView ? 'space-y-4' : 'grid grid-cols-2 gap-4'}>
                            {filteredFiles.length === 0 ? (
                                <div className="text-center text-gray-500">No files found.</div>
                            ) : (
                                filteredFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-center ${compactView ? 'space-x-4' : 'flex-col space-y-2'} rounded-lg bg-[#40404033] p-4`}
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <span className="truncate text-sm font-medium">
                                                {file.name}
                                            </span>
                                            <div className="flex space-x-3">
                                                <button
                                                    className="focus:outline-none"
                                                    onClick={() =>
                                                        handleCopyToClipboard(file.link, index)
                                                    }
                                                >
                                                    {isCopied[index] ? (
                                                        <FaCheckCircle
                                                            size={18}
                                                            className="text-green-400"
                                                        />
                                                    ) : (
                                                        <FaCopy
                                                            size={18}
                                                            className="text-gray-400"
                                                        />
                                                    )}
                                                </button>
                                                <button
                                                    className="focus:outline-none"
                                                    onClick={() =>
                                                        (window.location.href = `/studio?file=${encodeURIComponent(file.link)}`)
                                                    }
                                                >
                                                    <FaEdit size={18} className="text-blue-400" />
                                                </button>
                                                <button
                                                    className="focus:outline-none"
                                                    onClick={() => handleDeleteFile(file.link)}
                                                >
                                                    <FaTrash size={18} className="text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                        {!compactView && (
                                            <audio
                                                src={file.link}
                                                controls
                                                className="mt-2 w-full"
                                            ></audio>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {!session && (
                <div className="max-w-6xl text-center text-gray-200">
                    <h1 className="mb-4 text-2xl font-bold">Welcome to FE2 Audio Uploader</h1>
                    <p>
                        Are you looking for a simple way to upload and manage custom audio files for
                        your <strong>Flood Escape 2 (FE2)</strong> maps?{' '}
                        <strong>FE2 Audio Uploader</strong> allows you to easily upload{' '}
                        <code>.mp3</code> or <code>.ogg</code> files and access them for your maps.
                        Along with an uploader, there's a list page that lets you view and manage
                        all of your previously uploaded audio files, making your workflow smoother
                        and more efficient.
                    </p>
                    <p className="mt-4">
                        In this tutorial, you'll be walked through how to use the{' '}
                        <strong>FE2 Audio Uploader</strong> and the accompanying list page to
                        streamline your custom audio workflow.
                    </p>
                    <hr className="my-6" />
                    <h2 className="text-xl font-semibold">What This Tool Does</h2>
                    <ul className="mx-auto mt-2 max-w-2xl list-inside list-disc text-left">
                        <li>
                            Upload <code>.mp3</code> or <code>.ogg</code> audio files to use in your
                            custom FE2 maps.
                        </li>
                        <li>View all previously uploaded files in a simple and organized list.</li>
                        <li>Securely track your uploads via authorization!</li>
                    </ul>
                    <p className="mt-4">
                        This project is completely <strong>open-source</strong>, meaning you can
                        access the full codebase, contribute to it, or even set up your own version!
                    </p>
                    <hr className="my-6" />
                    <h2 className="text-xl font-semibold">Information</h2>
                    <p className="mt-2">
                        You can access the full source code on GitHub & Direction to Page{' '}
                        <a
                            href="https://github.com/jvqze/FE2-Audio-Uploader"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                        >
                            here
                        </a>
                    </p>
                    <p>
                        If you find this tool useful, please consider leaving a{' '}
                        <a
                            href="https://github.com/jvqze/FE2-Audio-Uploader"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                        >
                            star
                        </a>{' '}
                        on the GitHub repository to show your support!
                    </p>
                    <p className="mt-1 space-x-2">
                        <span>To get started, simply</span>
                        <button
                            onClick={() => signIn('discord')}
                            className="rounded bg-blue-600 px-3 py-2 text-sm text-white shadow-lg transition hover:bg-blue-700"
                        >
                            <span>Authorize with Discord</span>
                        </button>
                        <span>and start uploading your audio!</span>
                    </p>
                </div>
            )}

            {notification && (
                <Notification message={notification.message} type={notification.type} />
            )}
        </main>
    );
}
