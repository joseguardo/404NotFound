"""
Example usage of the Miro MCP client.

This script demonstrates how to:
1. Connect to Miro via MCP
2. Create flowchart diagrams from Mermaid syntax
3. Work with tables, documents, and other Miro features
"""

import asyncio
from mcp_clients import MCPRegistry, MiroMCP


async def create_order_processing_diagram():
    """Create the order processing flowchart from the example."""
    
    # Mermaid flowchart definition
    mermaid_flowchart = '''
    flowchart TD
        A[📦 Order Received] --> B{Inventory Check}
        B -->|In Stock| C[Process Payment]
        B -->|Out of Stock| D[Notify Supplier]
        D --> E[Backorder Created]
        E --> F{Supplier Response}
        F -->|Confirmed| G[Update ETA]
        F -->|Rejected| H[Cancel & Refund]
        C --> I[Generate Invoice]
        I --> J[Pick & Pack]
        J --> K[Ship Order]
        K --> L{Delivery Status}
        L -->|Delivered| M[✅ Complete]
        L -->|Failed| N[Return to Warehouse]
        N --> K
        G --> C
        H --> O[Notify Customer]
        M --> P[Request Feedback]
    '''
    
    board_url = "https://miro.com/app/board/uXjVG8m1Pxs=/"
    
    # Option 1: Using MCPRegistry
    async with MCPRegistry(only=["miro"]) as mcp:
        result = await mcp.miro.create_flowchart(
            board_id=board_url,
            title="Order Processing Flow",
            mermaid_flowchart=mermaid_flowchart,
            x=0,  # Center of board
            y=0
        )
        print(f"Created diagram with ID: {result.get('item_id')}")
        print(f"View at: {result.get('item_url')}")
    
    # Option 2: Using MiroMCP directly
    # async with MiroMCP() as miro:
    #     result = await miro.create_flowchart(
    #         board_id=board_url,
    #         title="Order Processing Flow - Direct",
    #         mermaid_flowchart=mermaid_flowchart,
    #         x=500,  # Offset to avoid overlap
    #         y=0
    #     )
    #     print(f"Direct creation result: {result}")


async def explore_board_contents():
    """Explore what's already on the board."""
    
    board_url = "https://miro.com/app/board/uXjVG8m1Pxs=/"
    
    async with MiroMCP() as miro:
        # Explore high-level board contents
        exploration = await miro.explore_board(board_url)
        print("Board contents:")
        for item in exploration.get('items', []):
            print(f"- {item.get('type')}: {item.get('title')}")
        
        # List all board items with details
        items = await miro.list_board_items(board_url, limit=10)
        print(f"\nTotal items: {len(items.get('data', []))}")
        
        for item in items.get('data', [])[:3]:  # Show first 3
            print(f"Item: {item.get('type')} - {item.get('id')}")


async def work_with_tables():
    """Example of creating and working with tables."""
    
    board_url = "https://miro.com/app/board/uXjVG8m1Pxs=/"
    
    async with MiroMCP() as miro:
        # Create a project tracking table
        table_result = await miro.create_table(
            board_id=board_url,
            table_title="Project Tasks",
            columns=[
                {"column_title": "Task", "column_type": "text"},
                {"column_title": "Assignee", "column_type": "text"},
                {
                    "column_title": "Status",
                    "column_type": "select",
                    "options": [
                        {"displayValue": "To Do", "color": "#FF0000"},
                        {"displayValue": "In Progress", "color": "#FFA500"},
                        {"displayValue": "Done", "color": "#00FF00"}
                    ]
                },
                {
                    "column_title": "Priority",
                    "column_type": "select", 
                    "options": [
                        {"displayValue": "High", "color": "#FF0000"},
                        {"displayValue": "Medium", "color": "#FFA500"},
                        {"displayValue": "Low", "color": "#00FF00"}
                    ]
                }
            ]
        )
        
        table_id = table_result.get('id')
        print(f"Created table with ID: {table_id}")
        
        # Add some rows
        if table_id:
            rows_result = await miro.sync_table_rows(
                board_id=board_url,
                item_id=table_id,
                rows=[
                    {
                        "cells": [
                            {"columnTitle": "Task", "value": "Implement user authentication"},
                            {"columnTitle": "Assignee", "value": "John Doe"},
                            {"columnTitle": "Status", "value": "In Progress"},
                            {"columnTitle": "Priority", "value": "High"}
                        ]
                    },
                    {
                        "cells": [
                            {"columnTitle": "Task", "value": "Design database schema"},
                            {"columnTitle": "Assignee", "value": "Jane Smith"},
                            {"columnTitle": "Status", "value": "Done"},
                            {"columnTitle": "Priority", "value": "Medium"}
                        ]
                    }
                ]
            )
            print(f"Added rows: {rows_result}")


async def create_documentation():
    """Create a document with project information."""
    
    board_url = "https://miro.com/app/board/uXjVG8m1Pxs=/"
    
    async with MiroMCP() as miro:
        doc_content = """
# Order Processing System Documentation

## Overview
This document describes the order processing system flow.

## Key Components

### 1. Inventory Management
- Real-time stock checking
- Automatic supplier notifications
- Backorder handling

### 2. Payment Processing
- Secure payment gateway integration
- Invoice generation
- Refund capabilities

### 3. Fulfillment
- Pick and pack operations
- Shipping integration
- Delivery tracking

## Process Flow
The complete flow is visualized in the flowchart diagram on this board.

### Success Path
1. Order received → Inventory check → Payment → Fulfillment → Delivery
2. Customer feedback collection

### Exception Handling
- Out of stock → Supplier notification → Backorder
- Delivery failure → Return to warehouse → Reship
- Payment issues → Cancel and refund

## Next Steps
- [ ] Implement automated testing
- [ ] Add monitoring and alerts
- [ ] Integrate with CRM system
        """
        
        doc_result = await miro.create_doc(
            board_id=board_url,
            content=doc_content.strip(),
            x=-400,  # Position to the left
            y=0
        )
        
        print(f"Created documentation: {doc_result.get('id')}")


async def main():
    """Run all examples."""
    print("🚀 Starting Miro MCP examples...")
    
    try:
        print("\n1. Creating order processing diagram...")
        await create_order_processing_diagram()
        
        print("\n2. Exploring board contents...")
        await explore_board_contents()
        
        print("\n3. Working with tables...")
        await work_with_tables()
        
        print("\n4. Creating documentation...")
        await create_documentation()
        
        print("\n✅ All examples completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())