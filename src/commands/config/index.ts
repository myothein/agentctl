import { Command } from 'commander';

import { configAddNew } from './add-new';
import { configSet } from './set';
import { configRemove } from './remove';
import { configGet } from './get';
import { configList } from './list';

import { configBackup } from './backup';
import { configEdit } from './edit';
import { configValidate } from './validate';
import { configDiff } from './diff';
import { configRestore } from './restore';
import { configListBackups } from './list-backups';
/**
 * Root config command
 */
export const config = new Command('config')
    .description('Manage tenant-agent configuration')

    // Core ops
    .addCommand(configAddNew)
    .addCommand(configSet)
    .addCommand(configRemove)
    .addCommand(configGet)
    .addCommand(configList)

    // Advanced ops
    .addCommand(configBackup)
    .addCommand(configEdit)
    .addCommand(configValidate)
    .addCommand(configDiff)
    .addCommand(configListBackups)
    .addCommand(configRestore);