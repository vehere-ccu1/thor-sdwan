// Thor SD-WAN CMS - MongoDB indexes (run with: mongosh sdwan_cms < db/mongodb/create_indexes.js)
// Ensure collections exist and create common indexes.

var collections = [
  'roles', 'users', 'accounts', 'groups', 'sites', 'audit_trail',
  'user_permissions', 'organization_tokens', 'devices', 'vpn_tunnels', 'firewall_rules'
];

collections.forEach(function(collName) {
  if (!db.getCollectionNames().includes(collName)) {
    db.createCollection(collName);
  }
});

db.users.createIndex({ email: 1 }, { unique: true });
db.roles.createIndex({ id: 1 }, { unique: true });
db.accounts.createIndex({ id: 1 }, { unique: true });
db.audit_trail.createIndex({ ts: -1 });
db.audit_trail.createIndex({ user_id: 1 });
db.organization_tokens.createIndex({ organization_id: 1 });

print('MongoDB schema (collections + indexes) applied.');
