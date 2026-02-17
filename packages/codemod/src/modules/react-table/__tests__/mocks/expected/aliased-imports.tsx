// @ts-nocheck
import { Table as MyTable, Table as MyBody, Table as MyCell, Table as MyHeader, Table as MyHead, Table as MyRow } from "@qualcomm-ui/react/table"
import { useState } from "react"


interface Person {
  name: string
}

const data: Person[] = [{name: "Alice"}, {name: "Bob"}]

export default function AliasedImports(): Element {
  return (
    <Table.Root>
        <Table.ScrollContainer>
          <Table.Table size="sm">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.map((person, i) => (
                <Table.Row key={i}>
                  <Table.Cell>{person.name}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Table>
        </Table.ScrollContainer>
      </Table.Root>
  )
}
