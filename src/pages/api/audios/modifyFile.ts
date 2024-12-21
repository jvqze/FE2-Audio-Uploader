import { NextApiRequest, NextApiResponse } from 'next';

import MongooseConnect from '../../../lib/MongooseConnect';
import userProfileModel from '../../../models/UserProfile';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await MongooseConnect();

    switch (req.method) {
        case 'POST':
            const {
                userid,
                audioLink,
                title,
                private: isPrivate,
                deletion_url,
                createdAt,
            } = req.body;
            if (typeof userid !== 'string') {
                return res.status(400).json({ message: 'Invalid userID format' });
            }

            try {
                const userProfile = await userProfileModel.findOneAndUpdate(
                    { userID: userid },
                    {
                        $setOnInsert: { userID: userid },
                        $push: {
                            uploads: {
                                audioLink,
                                title,
                                private: isPrivate,
                                deletion_url,
                                createdAt,
                            },
                        },
                    },
                    { new: true, upsert: true },
                );
                res.status(200).json({
                    message: 'File metadata saved successfully',
                    profile: userProfile,
                });
            } catch (error) {
                console.error('Error saving metadata:', error);
                res.status(500).json({ message: 'Error saving metadata' });
            }
            break;

        case 'DELETE':
            const { fileLink } = req.body;

            if (typeof fileLink !== 'string') {
                return res.status(400).json({ message: 'Invalid audioLink format' });
            }

            try {
                const userProfile = await userProfileModel.findOneAndUpdate(
                    { 'uploads.audioLink': fileLink },
                    { $pull: { uploads: { fileLink } } },
                );

                if (!userProfile) {
                    return res.status(404).json({ message: 'Audio not found' });
                }

                const deletedUpload = userProfile.uploads.find(
                    (upload: { audioLink: string }) => upload.audioLink === audioLink,
                );

                if (deletedUpload && deletedUpload.deletion_url) {
                    const response = await fetch(deletedUpload.deletion_url, {
                        method: 'GET',
                    });

                    if (!response.ok) {
                        console.error('Error deleting file from Tixte:', await response.text());
                        return res
                            .status(500)
                            .json({ message: 'Failed to delete file from Tixte' });
                    }
                }

                res.status(200).json({ message: 'File metadata and audio deleted successfully' });
            } catch (error) {
                console.error('Error deleting metadata:', error);
                res.status(500).json({ message: 'Error deleting metadata' });
            }
            break;
        case 'PATCH':
            const { userId, patchAudioLink, title: newTitle, public: newPrivacy } = req.body;
            if (typeof userId !== 'string') {
                return res.status(400).json({ message: 'Invalid userID or audioLink format' });
            }

            try {
                const userProfile = await userProfileModel.findOneAndUpdate(
                    { userID: userId, 'uploads.audioLink': patchAudioLink },
                    {
                        $set: {
                            'uploads.$.title': newTitle || undefined,
                            'uploads.$.private':
                                typeof newPrivacy === 'boolean' ? newPrivacy : undefined,
                        },
                    },
                    { new: true },
                );

                if (!userProfile) {
                    return res.status(404).json({ message: 'Query not matched' });
                }

                res.status(200).json({
                    success: true,
                    message: 'Audio details updated successfully',
                    updatedProfile: userProfile,
                });
            } catch (error) {
                console.error('Error updating audio details:', error);
                res.status(500).json({ message: 'Error updating audio details' });
            }

            break;
        case 'GET':
            try {
                const { userid, audioUrl } = req.query;

                if (typeof userid !== 'string' && typeof audioUrl !== 'string') {
                    return res.status(400).json({ message: 'Invalid query parameters.' });
                }

                if (audioUrl) {
                    const userProfile = await userProfileModel.findOne({
                        'uploads.audioLink': audioUrl,
                    });

                    if (!userProfile) {
                        return res.status(404).json({ message: 'Audio not found.' });
                    }

                    const audioDetails = userProfile.uploads.find(
                        (upload: { audioLink: string }) => upload.audioLink === audioUrl,
                    );

                    if (!audioDetails) {
                        return res
                            .status(404)
                            .json({ message: 'Audio not found in user uploads.' });
                    }

                    return res.status(200).json({
                        title: audioDetails.title,
                        public: !audioDetails.private,
                        createdAt: audioDetails.createdAt,
                    });
                }

                if (userid) {
                    const userProfile = await userProfileModel.findOne({ userID: userid });

                    if (!userProfile) {
                        return res.status(404).json({ message: 'User profile not found.' });
                    }

                    return res.status(200).json(
                        userProfile.uploads?.map(
                            (upload: {
                                title: string;
                                audioLink: string;
                                createdAt: Date;
                                deletion_url: string;
                            }) => ({
                                name: upload.title,
                                link: upload.audioLink,
                                createdAt: upload.createdAt,
                                deletion_url: upload.deletion_url,
                            }),
                        ) || [],
                    );
                }

                return res.status(400).json({ message: 'No valid query provided.' });
            } catch (error) {
                console.error('Error fetching files:', error);
                return res.status(500).json({ message: 'Error fetching files.' });
            }
        default:
            res.status(405).json({ message: 'Method not allowed' });
    }
}
