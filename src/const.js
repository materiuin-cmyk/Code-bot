/**
 * Copyright (C) 2025 Ginko
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/
 *
 * This code is part of Ginko project (https://github.com/ginkohub)
 */

export const CREDS_UPDATE = 'creds.update';

export const CONNECTION_UPDATE = 'connection.update';

export const MESSAGING_HISTORY_SET = "messaging-history.set";

export const PRESENCE_UPDATE = 'presence.update';

export const MESSAGES_UPSERT = 'messages.upsert';
export const MESSAGES_UPDATE = 'messages.update';
export const MESSAGES_DELETE = 'messages.delete';
export const MESSAGES_REACTION = 'messages.reaction';
export const MESSAGE_RECEIPT_UPDATE = 'message-receipt.update';

export const CHATS_UPSERT = 'chats.upsert';
export const CHATS_DELETE = 'chats.delete';
export const CHATS_UPDATE = 'chats.update';

export const BLOCKLIST_SET = 'blocklist.set';
export const BLOCKLIST_UPDATE = 'blocklist.update';

export const CALL = 'call';

export const CONTACTS_UPSERT = 'contacts.upsert';
export const CONTACTS_UPDATE = 'contacts.update';

export const GROUPS_UPSERT = 'groups.upsert';
export const GROUPS_UPDATE = 'groups.update';
export const GROUP_PARTICIPANTS_UPDATE = 'group-participants.update';

export const Events = {
  CONNECTION_UPDATE: 'connection.update',
  CREDS_UPDATE: 'creds.update',
  MESSAGING_HISTORY_SET: 'messaging-history.set',
  CHATS_UPSERT: 'chats.upsert',
  CHATS_UPDATE: 'chats.update',
  CHATS_PHONENUMBERSHARE: 'chats.phoneNumberShare',
  CHATS_DELETE: 'chats.delete',
  PRESENCE_UPDATE: 'presence.update',
  CONTACTS_UPSERT: 'contacts.upsert',
  CONTACTS_UPDATE: 'contacts.update',
  MESSAGES_DELETE: 'messages.delete',
  MESSAGES_UPDATE: 'messages.update',
  MESSAGES_MEDIA_UPDATE: 'messages.media-update',
  MESSAGES_UPSERT: 'messages.upsert',
  MESSAGES_REACTION: 'messages.reaction',
  MESSAGE_RECEIPT_UPDATE: 'message-receipt.update',
  GROUPS_UPSERT: 'groups.upsert',
  GROUPS_UPDATE: 'groups.update',
  GROUP_PARTICIPANTS_UPDATE: 'group-participants.update',
  GROUP_JOIN_REQUEST: 'group.join-request',
  BLOCKLIST_SET: 'blocklist.set',
  BLOCKLIST_UPDATE: 'blocklist.update',
  CALL: 'call',
}
