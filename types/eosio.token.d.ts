export module EosioToken {
    export module Transfer {
        export interface Data {
            from:     string;
            to:       string;
            quantity: string;
            memo:     string;
        }
    }
}