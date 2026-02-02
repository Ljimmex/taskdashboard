import { prepareGenericRequest } from './generic'
import { prepareDiscordRequest } from './discord'
import { prepareSlackRequest } from './slack'

export const WebhookAdapters = {
    generic: prepareGenericRequest,
    discord: prepareDiscordRequest,
    slack: prepareSlackRequest
}
