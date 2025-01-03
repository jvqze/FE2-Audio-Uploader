import { NextApiRequest, NextApiResponse } from 'next';

import MongooseConnect from '../../../lib/MongooseConnect';
import userProfileModel from '../../../models/UserProfile';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    await MongooseConnect();

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Authorization header missing');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).send('Token missing');
    }

    try {
        const userid = token as string;
        if (typeof userid !== 'string') {
            return res.status(400).send('Invalid userID format');
        }

        switch (req.method) {
            case 'POST': {
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
            }
            case 'DELETE':
                const { audioLink } = req.body;

                try {
                    const userProfile = await userProfileModel.findOneAndUpdate(
                        { userID: userid },
                        {
                            $pull: { uploads: { audioLink } },
                        },
                        { new: true },
                    );
                    return res.status(200).json({
                        message: 'File deleted successfully',
                        userProfile,
                    });
                } catch (error) {
                    return res.status(500).json({ message: 'Internal server error', error });
                }
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
    } catch (error) {
        console.log(error);
        res.status(401).json({ message: 'Invalid token', error });
    }
}

export const config = {
    api: {
        externalResolver: true,
    },
};
