import {
    Model,
    DataTypes,
    type InferAttributes,
    type InferCreationAttributes,
    type CreationOptional,
    type NonAttribute,
    type Association,
    type ForeignKey,
} from 'sequelize';
import sequelize from '../../../config/database.js';
import type { User } from '../../auth/models/User.js';
import type { RoommateRequest } from './RoommateRequest.js';

export const MatchStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED',
    EXPIRED: 'EXPIRED',
} as const;

export type MatchStatusType = (typeof MatchStatus)[keyof typeof MatchStatus];

export const UserMatchAction = {
    NONE: 'NONE',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED',
} as const;

export type UserMatchActionType = (typeof UserMatchAction)[keyof typeof UserMatchAction];

export const MatchSource = {
    SMART: 'SMART',
    WISH: 'WISH',
    DIRECT: 'DIRECT',
} as const;

export type MatchSourceType = (typeof MatchSource)[keyof typeof MatchSource];

export class RoommateMatch extends Model<
    InferAttributes<RoommateMatch>,
    InferCreationAttributes<RoommateMatch>
> {
    declare id: CreationOptional<string>;
    declare request_id: ForeignKey<string> | null;
    declare matched_request_id: ForeignKey<string> | null;
    declare requester_id: ForeignKey<string>;
    declare matched_user_id: ForeignKey<string>;
    declare compatibility_score: number;
    declare ai_explanation: string | null;
    declare source: CreationOptional<MatchSourceType>;
    declare status: CreationOptional<MatchStatusType>;
    declare requester_action: CreationOptional<UserMatchActionType>;
    declare matched_user_action: CreationOptional<UserMatchActionType>;
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;

    // Associations
    declare request?: NonAttribute<RoommateRequest>;
    declare matchedRequest?: NonAttribute<RoommateRequest>;
    declare requester?: NonAttribute<User>;
    declare matchedUser?: NonAttribute<User>;

    declare static associations: {
        request: Association<RoommateMatch, RoommateRequest>;
        matchedRequest: Association<RoommateMatch, RoommateRequest>;
        requester: Association<RoommateMatch, User>;
        matchedUser: Association<RoommateMatch, User>;
    };
}

RoommateMatch.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        request_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'roommate_requests',
                key: 'id',
            },
        },
        matched_request_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'roommate_requests',
                key: 'id',
            },
        },
        requester_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        matched_user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        compatibility_score: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 0,
                max: 100,
            },
        },
        ai_explanation: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        source: {
            type: DataTypes.ENUM(...Object.values(MatchSource)),
            allowNull: false,
            defaultValue: MatchSource.SMART,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(MatchStatus)),
            allowNull: false,
            defaultValue: MatchStatus.PENDING,
        },
        requester_action: {
            type: DataTypes.ENUM(...Object.values(UserMatchAction)),
            allowNull: false,
            defaultValue: UserMatchAction.NONE,
        },
        matched_user_action: {
            type: DataTypes.ENUM(...Object.values(UserMatchAction)),
            allowNull: false,
            defaultValue: UserMatchAction.NONE,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'roommate_matches',
        modelName: 'RoommateMatch',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['request_id'] },
            { fields: ['matched_request_id'] },
            { fields: ['requester_id'] },
            { fields: ['matched_user_id'] },
            { fields: ['compatibility_score'] },
        ],
    }
);

export default RoommateMatch;
