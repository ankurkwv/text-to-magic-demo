exports.handler = async function (context, event, callback) {
  var fs = require('fs');

  if (context.SYNC_SERVICE_SID && context.TWILIO_API_KEY && context.TWILIO_API_SECRET) {
    return callback(null, {
      syncServiceSid: context.SYNC_SERVICE_SID
    });
  }

  const assets = Runtime.getAssets();
  let flowDefinition = fs.readFileSync(assets["/studio.json"].path, 'utf8');

  const client = context.getTwilioClient();

  // Substitue the correct URL into the studio flow JSON
  function prepStudioFlow() {
    let postUrl = "https://" + context.DOMAIN_NAME + '/post_magic.js';
    flowDefinition = flowDefinition.replace('{{setup-replace-url}}', postUrl);
    console.log('Flow Definition replaced.');
  }

  // Deploy Twilio Studio Flow
  function deployStudio() {
    return client.studio.flows
        .create({
          friendlyName: 'Text to Magic',
          status: 'published',
          definition: flowDefinition,
        })
        .then((flow) => flow)
        .catch((err) => { console.log(err.details); throw new Error(err.details) });
  }

  function createApiKey() {
    return client.newKeys.create()
        .then(new_key => new_key)
        .catch((err) => { throw new Error(err.details) });
  }

  function createSyncService() {
    return client.sync.services.create()
        .then(service => service)
        .catch((err) => { throw new Error(err.details) });
  }

  function createSyncList(serviceSid) {
    return client.sync.services(serviceSid)
        .syncLists
        .create({
          uniqueName: context.SYNC_LIST_NAME
        })
        .then(sync_list => sync_list)
        .catch((err) => { throw new Error(err.details) });
  }

  function getPhoneNumberSid() {
    return new Promise((resolve, reject) => {
      client.incomingPhoneNumbers
        .list({ phoneNumber: context.TWILIO_PHONE_NUMBER, limit: 1 })
        .then((incomingPhoneNumbers) => {
          const n = incomingPhoneNumbers[0];
          resolve(n.sid);
        })
        .catch((err) => reject(err));
    });
  }

  function updatePhoneNumberWebhook(webhook, numberSid) {
    return new Promise((resolve, reject) => {
      client.incomingPhoneNumbers(numberSid)
        .update({
          smsUrl: webhook,
        })
        .then(() => {
          resolve('success');
        })
        .catch((err) => reject(err));
    });
  }

  const key = await createApiKey();
  console.log('API Key created: ' + key.sid);
  const syncService = await createSyncService();
  console.log('Sync Service created: ' + syncService.sid);
  const syncList = await createSyncList(syncService.sid);
  console.log('Sync List created: ' + syncList.sid);
  
  prepStudioFlow();
  const flow = await deployStudio(flowDefinition);
  console.log('Studio delployed: ' + flow.sid);

  const phoneNumberSid = await getPhoneNumberSid();
  await updatePhoneNumberWebhook(flow.webhookUrl, phoneNumberSid);
  console.log('Phone number sid updated: ' + phoneNumberSid);


  const environment = await getCurrentEnvironment();
  await createEnvironmentVariable(environment, 'SYNC_SERVICE_SID', syncService.sid);
  await createEnvironmentVariable(environment, 'TWILIO_API_KEY', key.sid);
  await createEnvironmentVariable(environment, 'TWILIO_API_SECRET', key.secret);
  console.log('Hosted environment variables created');

  return callback(null, {
    syncServiceSid: syncService.sid
  });


async function getCurrentEnvironment() {
  if (context.DOMAIN_NAME && context.DOMAIN_NAME.startsWith("localhost")) {
    return;
  }
  const services = await client.serverless.services.list();
  for (let service of services) {
    console.log("Searching for environment. Looping through service: " + service.sid);
    const environments = await client.serverless
      .services(service.sid)
      .environments.list();
    const environment = environments.find(
      env => env.domainName === context.DOMAIN_NAME
    );
    if (environment) {
      // Exit the function
      return environment;
    }
  }
}

async function getEnvironmentVariables(environment) {
  return await client.serverless
    .services(environment.serviceSid)
    .environments(environment.sid)
    .variables.list();
}

async function getEnvironmentVariable(environment, key) {
  // The list filter method isn't implemented yet.
  const envVars = await getEnvironmentVariables(environment);
  return envVars.find(variable => variable.key === key);
}

async function createEnvironmentVariable(environment, key, value) {
  try {
    if (!environment) {throw new Error('No Env!')}
    console.log(`Creating variable ${key}`);
    await client.serverless
      .services(environment.serviceSid)
      .environments(environment.sid)
      .variables.create({
        key: key,
        value: value
      });

  } catch (err) {
    console.error(`Error creating '${key}' with '${value}': ${err}`);
    return false;
  }
  return true;
}

};