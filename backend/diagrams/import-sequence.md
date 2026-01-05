# Feed Import Sequence Diagram

```mermaid
sequenceDiagram
    participant Script as Import Script
    participant Config as retailers.json
    participant DB as PostgreSQL
    participant FeedAPI as partner-ads.com
    participant Parser as XML Parser
    participant Importer as Product Importer

    Script->>Config: Read retailers list
    Config-->>Script: List of retailers

    Script->>DB: TRUNCATE product_aggregated, product_imported

    loop For each retailer
        Script->>Script: Build feed URL (banner_id, feed_id)
        Script->>DB: ensureRetailer(name, feed_url)
        DB-->>Script: retailer_id
        
        Script->>FeedAPI: GET feed XML
        FeedAPI-->>Script: XML content (latin1)
        
        Script->>Script: Save raw XML to xml-product-feeds/{retailer-name}.xml
        
        Script->>Parser: parseProductFeedFromXml(xml, retailer_id)
        alt retailer_id = 10 (tantegroencph.dk)
            Parser->>Parser: Include all products
        else Other retailers
            Parser->>Parser: Filter kategorinavn contains "Garn"
        end
        Parser-->>Script: Array of Product objects
        
        Script->>Importer: importProducts(products, retailer_id)
        loop Batch processing (500 at a time)
            Importer->>DB: INSERT INTO product_imported
            DB-->>Importer: Inserted count
        end
        Importer-->>Script: {inserted, updated}
    end

    Script->>DB: SELECT active yarns (search_query, negative_keywords)
    DB-->>Script: List of yarns

    loop For each active yarn
        Script->>Script: Process negative_keywords:<br/>Filter empty strings,<br/>Add % wildcards if missing
        Script->>DB: INSERT INTO product_aggregated<br/>SELECT cheapest per retailer<br/>WHERE name ILIKE search_query<br/>AND NOT name ILIKE ANY(processed_negative_keywords)<br/>AND stock_status = 'in_stock'
        Note over DB: DISTINCT ON (retailer_id)<br/>ORDER BY price_after_discount ASC
        DB-->>Script: Aggregated rows inserted (count)
        Note over Script: Track match count per yarn
    end

    Script->>DB: UPDATE yarn SET<br/>lowest_price_on_the_market = MIN(price_after_discount)<br/>FROM product_aggregated<br/>WHERE yarn_id matches<br/>AND yarn_type = 'single'
    DB-->>Script: Updated lowest prices for single yarns
    
    loop For each single yarn
        Script->>DB: UPDATE yarn SET<br/>is_active = (match_count > 0),<br/>active_since = NOW() if becoming active,<br/>inactive_since = NOW() if becoming inactive<br/>WHERE yarn_type = 'single'
        DB-->>Script: Updated yarn status
    end
    
    Script->>DB: SELECT all double yarns<br/>(yarn_id, main_yarn_id, carry_along_yarn_id)
    DB-->>Script: List of double yarns
    
    loop For each double yarn
        Script->>DB: Find retailers with BOTH component yarns<br/>WHERE stock_status = 'in stock'<br/>JOIN product_aggregated on retailer_id
        DB-->>Script: Retailers with both yarns + combined prices
        Script->>Script: Calculate:<br/>lowest_price = MIN(combined_price)<br/>is_active = (count > 0)
        Script->>DB: UPDATE yarn SET<br/>lowest_price_on_the_market = calculated_price,<br/>is_active = has_retailer,<br/>active_since/inactive_since timestamps
        DB-->>Script: Updated double yarn
    end
    
    Script->>DB: UPDATE yarn SET<br/>price_per_meter = lowest_price_on_the_market / skein_length<br/>WHERE lowest_price_on_the_market IS NOT NULL<br/>(applies to both single and double yarns)
    DB-->>Script: Updated price per meter

    Script->>DB: Close connection
```
