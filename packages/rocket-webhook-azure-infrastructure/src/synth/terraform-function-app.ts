import { BoosterConfig, rocketFunctionIDEnvVar } from '@boostercloud/framework-types'
import { ApplicationSynthStack, RocketUtils } from '@boostercloud/framework-provider-azure-infrastructure'
import { functionID } from '@boostercloud/rocket-webhook-types'
import { windowsFunctionApp } from '@cdktf/provider-azurerm'
import { getFunctionAppName } from '../helper'

export class TerraformFunctionApp {
  static build(
    {
      terraformStack,
      azureProvider,
      resourceGroup,
      resourceGroupName,
      applicationServicePlan,
      storageAccount,
      cosmosdbDatabase,
      appPrefix,
    }: ApplicationSynthStack,
    config: BoosterConfig,
    utils: RocketUtils
  ): windowsFunctionApp.WindowsFunctionApp {
    if (!cosmosdbDatabase) {
      throw new Error('Cosmosdb database not found')
    }
    if (!storageAccount) {
      throw new Error('Storage account not found')
    }
    if (!applicationServicePlan) {
      throw new Error('Application service plan not found')
    }
    const cosmosDatabaseName = cosmosdbDatabase?.name
    const cosmosDbConnectionString = cosmosdbDatabase?.primaryKey

    const id = utils.toTerraformName(appPrefix, 'webhookfunc')
    return new windowsFunctionApp.WindowsFunctionApp(terraformStack, id, {
      name: getFunctionAppName(resourceGroupName),
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      servicePlanId: applicationServicePlan.id,
      appSettings: {
        WEBSITE_RUN_FROM_PACKAGE: '1',
        WEBSITE_CONTENTSHARE: id,
        ...config.env,
        BOOSTER_ENV: config.environmentName,
        COSMOSDB_CONNECTION_STRING: `AccountEndpoint=https://${cosmosDatabaseName}.documents.azure.com:443/;AccountKey=${cosmosDbConnectionString};`,
        WEBSITE_CONTENTAZUREFILECONNECTIONSTRING: storageAccount.primaryConnectionString,
        [rocketFunctionIDEnvVar]: functionID,

        // Streaming support configuration
        FUNCTIONS_REQUEST_BODY_SIZE_LIMIT: '104857600', // 100MB DEFAULT
        WEBSITE_NODE_DEFAULT_VERSION: '~20',
        FUNCTIONS_WORKER_RUNTIME: 'node',
        FUNCTIONS_EXTENSION_VERSION: '~4',
      },
      storageAccountName: storageAccount.name,
      storageAccountAccessKey: storageAccount.primaryAccessKey,
      dependsOn: [resourceGroup],
      lifecycle: {
        ignoreChanges: ['app_settings["WEBSITE_RUN_FROM_PACKAGE"]'],
      },
      provider: azureProvider,
      siteConfig: {
        applicationStack: {
          nodeVersion: '~20',
        },
        // Add streaming configuration
        http2Enabled: true,
        minimumTlsVersion: '1.2',
      },
      functionsExtensionVersion: '~4',
    })
  }
}
