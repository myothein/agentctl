// winston-console.d.ts
declare module 'winston/lib/winston/transports/console' {
    import TransportStream = require('winston-transport');
    import { Format } from 'logform';
    type ConsoleTransportOptions = {
        level?: string;
        format?: Format;
        stderrLevels?: string[];
        consoleWarnLevels?: string[];
    };
    class ConsoleTransport extends TransportStream {
        constructor(opts?: ConsoleTransportOptions);
    }
    export = ConsoleTransport;
}
