exports.handler = function(context, event, callback) {
    const twilioClient = context.getTwilioClient();
    let request = twilioClient.sync.services(context.SYNC_SERVICE_SID)
       .syncLists('MagicTexters')
       .syncListItems
       .create({data: {"name":event.name}});
    
    request.then(function(result) {
       callback(null, 'Posted');
    });
};