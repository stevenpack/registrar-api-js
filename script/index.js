let axios = require('axios').default;

//WARNING: $8.00 per time you run it with a new .xyz domain!
const DOMAIN = "test-domain-123.xyz";

//I'm using a 2 account structure
//  1) Customer bucket: to contain all the customer/family domains
//  2) Corporate bucket: to contain the web domain that all http/s gets funneled to

//Account ID for the customer bucket
const CUSTOMER_ACCOUNT_ID = ""; //
const TARGET_ZONE_ID = ""; //SSL for SaaS Zone
const API_KEY = process.env.API_KEY; //Read from env. TODO: use scoped tokens for better security

const API_EMAIL = ""
const API_BASE = "https://api.cloudflare.com";

const conf = {
    headers: {
        "Content-Type": "application/json",
        "X-Auth-Email": API_EMAIL,
        "X-Auth-Key": API_KEY
    }
};

async function main() {
    //Check and register
    let canRegister = await checkDomain(DOMAIN);
    if (canRegister) {
        info("Let's proceed.")
        let contactId = await saveContact();
        let success = await registerDomain(DOMAIN, contactId);
        if (success) {            
            info("Success! Run again for post registration steps");
        }
    } else {
        //Assume the domain is registered, on cloudflare, and add records.
        info("Post registration steps")
        let zone = await getZoneDetails(DOMAIN);
        await addMXRecords(zone.id);

        //Point the customer web traffic to a single site
        await addCnameRecord(zone.id);

        //Add a 'custom hostname' to that single site so it can receive the traffic
        //And also present a custom SSL cert
        let result = await addCustomHostname(TARGET_ZONE_ID, DOMAIN);

        //Add TXT record to prove (to ourselves) that we have control of the domain
        await addTxtRecord(zone.id, result.ownership_verification.name, result.ownership_verification.value);
        //poll for completion
    }
    
}

//Domain and DNS Records
async function checkDomain(domain) {
    info(`Checking ${domain}...`);
    let url = `${API_BASE}/client/v4/accounts/${CUSTOMER_ACCOUNT_ID}/registrar/domains/${domain}/check`;
    let res = await axios.get(url, conf);
    debug(JSON.stringify(res.data));
    info(`canRegister: ${res.data.result.can_register}.`);
    return res.data.result.can_register;
}
async function saveContact() {
    //Save contact info
    //NOTE: Will disappear in next API release to be part of 'register' call.
    let url = `${API_BASE}/client/v4/accounts/${CUSTOMER_ACCOUNT_ID}/registrar/contacts`;
    let contact = {
        "first_name": "John",
        "last_name": "Doe",
        "organization": "My company",
        "email": "john.doe@example.com",
        "fax": "",
        "phone": "+1.5551231234",
        "address": "101 Townsend ST",
        "address2": "",
        "city": "San Francisco",
        "state": "CA",
        "country": "US",
        "zip": "94107"
    };
    let res = await axios.post(url, contact, conf);
    debug(JSON.stringify(res.data));
    info(res.data.result.message);
    return res.data.result.contact_id;
}
async function registerDomain(domain, contactId) {
    info(`Registering ${domain}...`)
    let url = `${API_BASE}/client/v4/accounts/${CUSTOMER_ACCOUNT_ID}/registrar/domains/${domain}/register`;
    let registration = {
        "name": domain,
        "years": 1,
        "auto_renew": true,
        "privacy": true,
        "registrant_contact_id": contactId
    }      
    let res = await axios.post(url, registration, conf)
    debug(res.data);
    return res.data.success;
}
async function addMXRecords(zoneId) {
    let mx1 = {
        "content": "mx1.mail.com",
        "name": "@",
        "priority": 10,
        "type": "MX"
    };
    let mx2 = Object.assign({}, mx1);
    mx2.content = "mx2.mail.com";
    mx2.priority = 20;

    let url = `${API_BASE}/client/v4/zones/${zoneId}/dns_records`;
    await axios.post(url, mx1, conf);
    await axios.post(url, mx2, conf);
    info(`Added MX records`);
}

async function addCnameRecord(zoneId) {
    //CNAME to the "SSL for SaaS" domain which has the web content
    
    let cname = {
        "content": "web.family-email.cf",
        "name": "@",
        "type": "CNAME",
        "proxied": true
    };
    let url = `${API_BASE}/client/v4/zones/${zoneId}/dns_records`;
    await axios.post(url, cname, conf);
    info(`Added CNAME record`);
}

//SSL and Web
async function addCustomHostname(zoneId, domain) {
    //NOTE: THIS IS A DIFFERENT ACCOUNT (I've split the customer zones into
    //one and the target zone with the website into another)   
    //The point of this is so you don't have to configure every domain, you just
    //route it all through a single one and make your settings there. 
    let customHostnameProps = {
        "hostname": domain,
        "ssl": {
            "method": "http",
            "type": "dv",
            "settings": {
              "http2": "on",
              "http3": "on",
              "min_tls_version": "1.2",
              "tls_1_3": "on",        
            },
            "bundle_method": "ubiquitous",
            "wildcard": false,
        }       
    }
    let url = `${API_BASE}/client/v4/zones/${zoneId}/custom_hostnames`;
    debug(url);
    let res = await axios.post(url, customHostnameProps, conf);
    debug(JSON.stringify(res.data));
    info("Added custom hostname");
    return res.data.result;
}

async function addTxtRecord(zoneId, name, content) {

    let txt = {
        "content": content,
        "name": name,
        "type": "TXT",
    };
    let url = `${API_BASE}/client/v4/zones/${zoneId}/dns_records`;
    await axios.post(url, txt, conf);
    info(`Added TXT record`);

}

//Utils
async function getZoneDetails(domain) {
    info(`Getting zone details for ${domain}`);
    let res = await axios.get(`${API_BASE}/client/v4/zones?name=${domain}`, conf);
    debug(JSON.stringify(res.data));
    return res.data.result[0];
}

//Poll for verification if required (when the site is available)


function debug(msg) {
    console.debug(msg);
}

function info(msg) {
    console.log(msg);
}

main();