import sequelize from '../../../config/database.js';
import { User } from '../../auth/models/User.js';
import { Property } from '../../properties/models/Property.js';
import { Conversation } from './Conversation.js';
import { Message } from './Message.js';
Conversation.belongsTo(User, {
    foreignKey: 'participant_one_id',
    as: 'participantOne',
});
Conversation.belongsTo(User, {
    foreignKey: 'participant_two_id',
    as: 'participantTwo',
});
Conversation.belongsTo(Property, {
    foreignKey: 'property_id',
    as: 'property',
});
Conversation.hasMany(Message, {
    foreignKey: 'conversation_id',
    as: 'messages',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});
Message.belongsTo(Conversation, {
    foreignKey: 'conversation_id',
    as: 'conversation',
});
Message.belongsTo(User, {
    foreignKey: 'sender_id',
    as: 'sender',
});
User.hasMany(Message, {
    foreignKey: 'sender_id',
    as: 'sentMessages',
});
User.hasMany(Conversation, {
    foreignKey: 'participant_one_id',
    as: 'participantOneConversations',
});
User.hasMany(Conversation, {
    foreignKey: 'participant_two_id',
    as: 'participantTwoConversations',
});
export { sequelize };
export { Conversation } from './Conversation.js';
export { Message } from './Message.js';
export { User } from '../../auth/models/User.js';
export { Profile } from '../../auth/models/Profile.js';
export { Property } from '../../properties/models/Property.js';
export default {
    sequelize,
    Conversation,
    Message,
};
