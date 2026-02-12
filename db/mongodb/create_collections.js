// Thor SD-WAN CMS - Create MongoDB collections (run with: mongosh sdwan_cms < db/mongodb/create_collections.js)

var collections = [
  'roles', 'users', 'accounts', 'groups', 'sites', 'audit_trail',
  'user_permissions', 'organization_tokens', 'devices', 'vpn_tunnels', 'firewall_rules'
];

collections.forEach(function(collName) {
  if (!db.getCollectionNames().includes(collName)) {
    db.createCollection(collName);
    print('Created collection: ' + collName);
  }
});

print('Done.');
