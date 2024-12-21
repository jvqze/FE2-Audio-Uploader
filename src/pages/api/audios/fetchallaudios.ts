import { NextApiRequest, NextApiResponse } from 'next';

import MongooseConnect from '../../../lib/MongooseConnect';
import userProfileModel from '../../../models/UserProfile';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        await MongooseConnect();
        const profiles = await userProfileModel
            .find(
                { 'uploads.private': false },
                {
                    userID: 1,
                    username: 1,
                    discordAvatar: 1,
                    uploads: 1,
                    createdAt: 1,
                },
            )
            .lean();

        const filteredProfiles = profiles.map(profile => ({
            ...profile,
            uploads: profile.uploads.filter((upload: { private: boolean }) => !upload.private),
        }));

        res.status(200).json(filteredProfiles);
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profiles' });
    }
}
