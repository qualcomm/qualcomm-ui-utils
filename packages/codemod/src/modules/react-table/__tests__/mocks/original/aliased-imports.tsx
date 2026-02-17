// @ts-nocheck
import {useState} from "react"

import {
  QTable as MyTable,
  QTbody as MyBody,
  QTd as MyCell,
  QTh as MyHeader,
  QThead as MyHead,
  QTr as MyRow,
} from "@qui/react-table"

interface Person {
  name: string
}

const data: Person[] = [{name: "Alice"}, {name: "Bob"}]

export default function AliasedImports(): Element {
  return (
    <MyTable size="sm">
      <MyHead>
        <MyRow>
          <MyHeader>Name</MyHeader>
        </MyRow>
      </MyHead>
      <MyBody>
        {data.map((person, i) => (
          <MyRow key={i}>
            <MyCell>{person.name}</MyCell>
          </MyRow>
        ))}
      </MyBody>
    </MyTable>
  )
}
