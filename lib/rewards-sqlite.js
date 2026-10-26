import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {REWARD_SCHEMA} from './rewards.js';
export function openRewardsDatabase(filename='data/private/rewards.sqlite'){
 const target=filename===':memory:'?filename:resolve(filename);if(target!==':memory:')mkdirSync(dirname(target),{recursive:true});
 const database=new DatabaseSync(target);database.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;'+REWARD_SCHEMA);
 return {
  close:()=>database.close(),
  prepare(sql){return {
   bind(...args){const statement=database.prepare(sql);return {
    async first(){return statement.get(...args)||null;},
    async all(){return {results:statement.all(...args)};},
    async run(){return {meta:statement.run(...args)};}
   };}
  };}
 };
}
