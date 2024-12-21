import { NextApiRequest, NextApiResponse } from 'next';

import MongooseConnect from '../../../lib/MongooseConnect';
import userProfileModel from '../../../models/UserProfile';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await MongooseConnect();

    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                const { userid } = req.query;
                if (!userid || typeof userid !== 'string') {
                    return res.status(400).json({ message: 'Invalid userid parameter.' });
                }

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
            } catch (error) {
                console.error('Error fetching files:', error);
                return res.status(500).json({ message: 'Error fetching files.' });
            }

        default:
            res.setHeader('Allow', ['GET']);
            return res.status(405).end(`Method ${method} Not Allowed`);
    }
}
