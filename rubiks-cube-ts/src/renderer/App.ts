import { app, BrowserWindow } from 'electron';
import {Main} from '../main/main';

Main.main(app, BrowserWindow);

module.exports = {};