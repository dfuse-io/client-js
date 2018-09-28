export module Eosio {
    export module Table {
        export interface Global {
            last_name_close:                     string;
            total_producer_vote_weight:          number;
            last_producer_schedule_size:         number;
            thresh_activated_stake_time:         number;
            total_activated_stake:               number;
            total_unpaid_blocks:                 number;
            perblock_bucket:                     number;
            pervote_bucket:                      number;
            last_pervote_bucket_fill:            number;
            last_producer_schedule_update:       string;
            total_ram_stake:                     number;
            total_ram_bytes_reserved:            number;
            max_ram_size:                        number;
            max_authority_depth:                 number;
            max_inline_action_depth:             number;
            max_inline_action_size:              number;
            max_transaction_delay:               number;
            deferred_trx_expiration_window:      number;
            max_transaction_lifetime:            number;
            min_transaction_cpu_usage:           number;
            max_transaction_cpu_usage:           number;
            target_block_cpu_usage_pct:          number;
            max_block_cpu_usage:                 number;
            context_free_discount_net_usage_den: number;
            context_free_discount_net_usage_num: number;
            net_usage_leeway:                    number;
            base_per_transaction_net_usage:      number;
            max_transaction_net_usage:           number;
            target_block_net_usage_pct:          number;
            max_block_net_usage:                 number;
        }
    }
}