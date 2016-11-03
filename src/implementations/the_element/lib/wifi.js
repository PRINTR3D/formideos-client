'use strict';

const fs         = require('fs');
const exec       = require('child_process').exec;
const bashEscape = require('../bashutils').escape;
const service    = 'sudo fiw'; // NB: all sudo actions have to be permitted in sudoers.d/formide

/**
 * Filter list of networks to only return valid essids
 * @param stdout
 * @returns {{}}
 */
function getSsids(stdout) {
    const essids = stdout.split('\n').filter(a => a);
    let result = {};

    for (const essid of essids) {
        // HACK: NAT-160: removing weird entries
        if (essid.startsWith('\\x'))
            continue;

        // HACK: NAT-124: removing weird ping
        if (essid.startsWith('PING '))
            break;

        result[essid] = { ssid: essid };
    }

    return result;
}

module.exports = {

    /**
     * Get a list of nearby Wi-Fi networks
     * @param callback
     */
    list(callback) {
        exec(`${service} wlan0 cached-scan`, (err, stdout) => {
            if (err || !stdout)
                return exec('sudo fiw wlan0 scan', (err, stdout) => {
                    if (err)
                        return callback(err);

                    const result = getSsids(stdout);
                    return callback(null, result);
                });

            const result = getSsids(stdout);
            return callback(null, result);
        });
    },

    /**
     * Get current Wi-Fi status from fiw service
     * @param callback
     */
    status(callback) {
        exec(`${service} wlan0 status`, (err, stdout) => {
            if (err)
                return callback(err);

            const isConnected = stdout.trim() == 'connected,configured';
            return callback(null, isConnected);
        });
    },

    /**
     * Get name of network currently connected to
     * @param callback
     */
    network(callback) {
        exec(`${service} wlan0 network`, (err, stdout) => {
            if (err)
                return callback(err);

            const network = stdout.trim();
            return callback(null, network);
        });
    },

    /**
     * Get IP address
     * @param callback
     */
    ip(callback) {
        exec(`${service} wlan0 ip`, (err, stdout) => {
            if (err)
                return callback(err);

            const ip = stdout.trim();
            return callback(null, ip);
        });
    },

    /**
     * Get MAC address
     * @param callback
     */
    mac(callback) {
        exec(`${service} wlan0 mac`, (err, stdout) => {
            if (err)
                return callback(err);

            const mac = stdout.trim();
            return callback(null, mac);
        });
    },

    /**
     * Connect to a network by essid/password combo
     * @param essid
     * @param password
     * @param customConfig
     * @param callback
     * @returns {*}
     */
    connect(essid, password, callback) {
        //if (customConfig)
        //    return this.connectEnterprise(customConfig, callback);

        if (essid == null || essid.length === 0 || essid.length > 32)
            return callback(new Error('essid must be 1..32 characters'));

        if (password.length !== 0 && (password.length < 8 || password.length > 63))
            return callback(new Error('password must be 8..63 characters, or 0 characters for an unprotected network'));

        const _essid    = bashEscape(essid);
        const _password = bashEscape(password);

        var connectCommand = `${service} wlan0 connect ${_essid} ${_password}`;
        connectCommand = connectCommand.trim();

        exec(connectCommand, function (err, stdout, stderr) {
            if (err || stderr)
                return callback(new Error(`Failed to connect to ${essid}`));

            if (stdout.trim() !== 'OK')
                return callback(new Error(`Failed to connect with custom config`));

            return callback(null, { message: `Successfully connected to ${essid}` });
        });
    },

    /**
     * Connect to a network using a custom wpa_supplicant configuration
     * This allows connecting to any network that is supported by wpa_supplicant, including 802.11x networks
     * @param wpaConfigFile
     * @param callback
     */
    connectEnterprise(wpaConfig, callback) {
        const configFilePath = '/data/wpa_supplicant.conf';

        // TODO: add lock file info

        fs.writeFileSync(configFilePath, wpaConfig);

        // execute reconnect of fiw service
        exec(`${service} wlan0 reconnect`, (err, stdout) => {
            if (err)
                return callback(err);

            if (stdout.trim() !== 'OK')
                return callback(new Error(`Failed to connect with custom config`));

            return callback(null, { message: "Successfully connected with custom config" });
        });
    },

    /**
     * Reset Wi-Fi and fall back to hot-spot mode
     * @param callback
     */
    reset(callback) {
        exec(`${service} wlan0 reset`, (err, stdout) => {
            if (err)
                return callback(err);

            return callback(null, { message: "Successfully reset wlan0" });
        });
    }
};
