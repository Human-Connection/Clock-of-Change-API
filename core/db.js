'use strict';

let mysql  = require('mysql'),
    moment = require('moment');

// TODO: refactor
let pool = mysql.createPool({
    host              : process.env.MYSQL_HOST || 'localhost',
    user              : process.env.MYSQL_USER || '',
    password          : process.env.MYSQL_PASS || '',
    database          : process.env.MYSQL_DB   || 'clock_of_change',
    //socketPath        : '/var/run/mysqld/mysqld.sock',
    connectionLimit   : 30,
    supportBigNumbers : true
});

exports.toggleEntryStatus = function(id, state, callback){
    pool.getConnection(function(err, connection) {
        if(err) { console.log(err); callback(true); return; }
        // TODO: UPDATE STATUS
        // 1 = confirmed | 2 = removed
        let sql;
        if(state === '1' || state === '0'){
            sql  = "UPDATE entries SET status = ? WHERE id = ?";
        }else{
            callback({}, false);
            return;
        }

        // make the query
        connection.query(sql, [state, id], function(err, results) {
            connection.release();
            if(err) { callback(results, true); return; }
            callback(results, false);
        });
    });
};

exports.toggleEmailConfirmed = function(id, state, callback){
    pool.getConnection(function(err, connection) {
        if(err) { console.log(err); callback(true); return; }
        let sql;
        if(parseInt(state) === 0 || parseInt(state) === 1){
            sql  = "UPDATE entries SET email_confirmed = ? WHERE id = ?";
        }else{
            callback({}, false);
            return;
        }

        // make the query
        connection.query(sql, [state, id], function(err, results) {
            connection.release();
            if(err) { callback(results, true); return; }
            callback(results, false);
        });
    });
};

exports.toggleNotApproved = function(id, notApproved, callback){
    pool.getConnection(function(err, connection) {
        if(err) { console.log(err); callback(true); return; }
        let sql;
        let status = 1;
        if (notApproved === '0') {
            sql  = "UPDATE entries SET status = ?, not_approved = ? WHERE id = ?";
        } else if(notApproved === '1') {
            sql  = "UPDATE entries SET status = ?, not_approved = ? WHERE id = ?";
            status = 0;
        }

        // make the query
        connection.query(sql, [status, notApproved, id], function(err, results) {
            connection.release();
            if(err) { callback(results, true); return; }
            callback(results, false);
        });
    });
};

exports.isValidApiKey = function(secret, callback){
    pool.getConnection(function(err, connection) {
        if(err) { console.log(err); callback(true); return; }

        let sql  = "SELECT * from apikeys WHERE secret = ?;";

        // make the query
        connection.query(sql, [secret], function(err, results) {
            connection.release();
            if(err) { callback(results, true); return; }
            callback(results, false);
        });
    });
};

exports.getEntries = function(filter, callback){
    pool.getConnection(function(err, connection) {
        if(err) {
            console.log(err);
            callback(true);
            return;
        }

        let sql = 'SELECT * FROM entries';

        if (filter['active'] === 1) {
            sql += ' WHERE email_confirmed = 1 AND status = 1';
        }

        if (filter['profileImage'] === 1) {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' image != \'\'';
        }

        if (filter['confirmed'] === 'yes') {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' email_confirmed = 1';
        } else if (filter['confirmed'] === 'no') {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' email_confirmed = 0';
        }

        if (filter['country'] && filter['country'].length > 0) {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' country = ' + pool.escape(filter['country']);
        }

        if (filter['status'] === 'active' && filter['active'] !== 1) {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' status = 1';
        } else if (filter['status'] === 'inactive' && filter['active'] !== 1) {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' status = 0';
        }

        if (filter['search'] && filter['search'].length > 0) {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' email LIKE ' + pool.escape('%' + filter['search'] + '%') + '';
        }

        let orderBy = filter['orderBy'] ? filter['orderBy'] : 'id';
        let order   = filter['order'] ? filter['order'] : 'desc';

        sql += ' ORDER BY ' + orderBy + ' '+ order + ' LIMIT ? OFFSET ?;';

        // make the query
        connection.query(sql, [filter['limit'], filter['offset']], function(err, results) {
            connection.release();
            if(err) { callback(results, true); return; }
            callback(results, false);
        });
    });
};

exports.getEntry = function(id, callback){
    pool.getConnection(function(error, connection) {
        if(error) {
            console.log(error);
            callback(true);
            return;
        }

        let sql = 'SELECT * FROM entries WHERE id = ?';

        connection.query(sql, [id], function(error, result) {
            connection.release();
            if(error) {
                callback(result, error);
                return;
            }
            if (!result || !result.length) {
                callback(null, 'Entry with the specified id does not exist');
                return;
            }
            callback(result, false);
        });
    });
};

exports.getUserByHash = function(hash, callback){
    pool.getConnection(function(err, connection) {
        if (err) { console.log(err); callback(true); return; }

        let sql  = "SELECT id, email, firstname from entries WHERE confirm_key = ?;";

        // make the query
        connection.query(sql, [hash], function(err, results) {
            connection.release();
            if(err) { callback(results, true); return; }
            callback(results, false);
        });
    });
};

exports.disableEntry = function(hash, callback){
    pool.getConnection(function(err, connection) {
        if(err) { console.log(err); callback(true); return; }

        let sql  = "UPDATE entries set email_confirmed = 0, confirmed_at = ? "
            + "WHERE  confirm_key = ?;";

        // make the query
        connection.query(sql, [moment().valueOf(), hash], function(err, results) {
            connection.release();
            if(err || results.affectedRows < 1) { callback(results, true); return; }
            callback(results, false);
        });
    });
};

exports.deleteEntry = function(id, callback){
    pool.getConnection(function(error, connection) {
        if(error) {
            console.log(error);
            callback(error);
            return;
        }
        let sql = "DELETE FROM entries WHERE id = ?";

        // make the query
        connection.query(sql, [id], function(error) {
            connection.release();
            if(error) {
                callback(error);
                return;
            }
            callback(false);
        });
    });
};

exports.deleteImage = function(id, callback){
    pool.getConnection(function(err, connection) {
        if(err) { console.log(err); callback(true); return; }

        let sql  = "UPDATE entries set image = '' "
            + "WHERE  id=?;";

        connection.query(sql, [id], function(error) {
            console.log(this.sql);
            connection.release();
            if(error) {
                callback(error);
                return;
            }
            callback(false);
        });
    });
};

exports.getCount = function(filter, callback){
    console.log(filter);
    pool.getConnection(function(err, connection) {
        if(err) { console.log(err); callback(true); return; }

        // let sql  = "SELECT count(*) as cnt FROM entries WHERE email_confirmed > 0 AND status < 2 AND country != '';";
        let sql = 'SELECT count(*) as cnt FROM entries';

        if (filter['active'] === 1) {
            sql += ' WHERE email_confirmed > 0 AND status < 2 AND country != \'\'';
        }

        if (filter['profileImage'] === 1) {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' image != \'\'';
        }

        if (filter['confirmed'] === 'yes') {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' email_confirmed = 1';
        } else if (filter['confirmed'] === 'no') {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' email_confirmed = 0';
        }

        if (filter['status'] === 'active' && filter['active'] !== 1) {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' status = 1';
        } else if (filter['status'] === 'inactive' && filter['active'] !== 1) {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' status = 0';
        }

        if (filter['search'] && filter['search'].length > 0) {
            sql += (sql.includes('WHERE') ? ' AND' : ' WHERE') + ' email LIKE ' + pool.escape('%' + filter['search'] + '%') + '';
        }

        // make the query
        connection.query(sql, function(err, results) {
            console.log(this.sql);
            connection.release();
            if(err) { callback(results, true); return; }
            callback(results, false);
        });
    });
};

exports.getCountries = function(callback){
    pool.getConnection(function(err, connection) {
        if(err) { console.log(err); callback(true); return; }

        let sql  = "SELECT country, COUNT(id) AS number FROM entries WHERE email_confirmed > 0 AND status < 2 AND country != '' GROUP BY country ORDER BY number DESC;";

        connection.query(sql, function(err, results) {
            connection.release();
            if(err) { callback(results, true); return; }
            callback(results, false);
        });
    });
};

exports.saveEntry = function(fields, callback){
    pool.getConnection(function(err, connection) {
        if(err) { console.log(err); callback(true); return; }
        let data = prepareEntry(fields);

        let sqlEmailExists  = "SELECT count(*) as cnt FROM entries WHERE email = ?;";
        connection.query(sqlEmailExists, [data.email], function(err, results) {
            if(!err) {
                if(results[0]['cnt'] > 0){
                    callback({email: "Email address already exists"});
                    return;
                }else{
                    let sql  = "INSERT INTO entries (firstname, lastname, email, country, message, anon, image, "
                        + "created_at, updated_at, confirmed_at, email_confirmed, confirm_key, beta, newsletter, pax) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

                    // run the query
                    connection.query(
                        sql,
                        [
                            data.firstname,
                            data.lastname,
                            data.email,
                            data.country,
                            data.message,
                            data.anon,
                            data.image,
                            data.created_at,
                            data.updated_at,
                            Math.floor(new Date().getTime() / 1000),
                            1,
                            data.randomHash,
                            data.beta,
                            data.newsletter,
                            data.pax,
                        ],
                        function(err, results) {
                            connection.release();
                            console.log('this.sql', this.sql); //command/query
                            if(err) { callback({error: "Internal server error"}); return; }
                            callback(false, results);
                        }
                    );
                }
            }
        });
    });
};

exports.updateEntry = function(id, fields, callback){
    pool.getConnection(function(error, connection) {
        if (error) {
            console.log(error);
            callback(error);
            return;
        }

        let fieldSqlStatements = [];
        for (let key in fields) {
            fieldSqlStatements.push(key + ' = ' + pool.escape(fields[key]));
        }

        let sql  = "UPDATE entries SET " + fieldSqlStatements.join(', ') + " WHERE  id=?;";

        // make the query
        connection.query(sql, [id], function(error) {
            connection.release();
            if(error) {
                callback(error);
                return;
            }
            callback(false);
        });
    });
};

/**
 * this function is to prevent application errors
 */
function prepareEntry(data){
    let now = moment().valueOf();

    data["image"] = data["image"].replace("uploads\\", "");

    // set timestamps
    data["created_at"] = now;
    data["updated_at"] = now;

    return data;
}
