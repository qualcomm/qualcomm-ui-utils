// @ts-nocheck
import { flexRender, useReactTable, Table } from "@qualcomm-ui/react/table"
import { createColumnHelper, getCoreRowModel } from "@qualcomm-ui/core/table"
import { useState } from "react"


interface Person {
  age: number
  firstName: string
  lastName: string
  progress: number
  status: string
  visits: number
}

const defaultData: Person[] = [
  {
    age: 24,
    firstName: "tanner",
    lastName: "linsley",
    progress: 50,
    status: "In Relationship",
    visits: 100,
  },
  {
    age: 40,
    firstName: "tandy",
    lastName: "miller",
    progress: 80,
    status: "Single",
    visits: 40,
  },
  {
    age: 45,
    firstName: "joe",
    lastName: "dirte",
    progress: 10,
    status: "Complicated",
    visits: 20,
  },
]

const columnHelper = createColumnHelper<Person>()

const columns = [
  columnHelper.accessor("firstName", {
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
    header: () => "First Name",
  }),
  columnHelper.accessor((row) => row.lastName, {
    cell: (info) => <i>{info.getValue()}</i>,
    footer: (info) => info.column.id,
    header: "Last Name",
    id: "lastName",
  }),
  columnHelper.accessor("age", {
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
    header: "Age",
  }),
  columnHelper.accessor("visits", {
    footer: (info) => info.column.id,
    header: "Visits",
  }),
  columnHelper.accessor("status", {
    footer: (info) => info.column.id,
    header: "Status",
  }),
  columnHelper.accessor("progress", {
    footer: (info) => info.column.id,
    header: "Profile Progress",
  }),
]

export default function Basic(): Element {
  const [data] = useState(() => [...defaultData])

  const table = useReactTable({
    columns,
    data,
    filterFns: {},
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col gap-4 overflow-x-auto p-2">
      <Table.Root>
            <Table.ScrollContainer>
              <Table.Table size="sm">
                <Table.Header>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <Table.Row key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <Table.HeaderCell key={header.id} align="left">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </Table.HeaderCell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Header>
                <Table.Body>
                  {table.getRowModel().rows.map((row) => (
                    <Table.Row key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
                <Table.Footer>
                  {table.getFooterGroups().map((footerGroup) => (
                    <Table.Row key={footerGroup.id}>
                      {footerGroup.headers.map((header) => (
                        <Table.HeaderCell key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.footer,
                                header.getContext(),
                              )}
                        </Table.HeaderCell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Footer>
              </Table.Table>
            </Table.ScrollContainer>
          </Table.Root>

      <Table.Root>
            <Table.ScrollContainer>
              <Table.Table>
                <Table.Header>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <Table.Row key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <Table.HeaderCell key={header.id} align="left">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </Table.HeaderCell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Header>
                <Table.Body>
                  {table.getRowModel().rows.map((row) => (
                    <Table.Row key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
                <Table.Footer>
                  {table.getFooterGroups().map((footerGroup) => (
                    <Table.Row key={footerGroup.id}>
                      {footerGroup.headers.map((header) => (
                        <Table.HeaderCell key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.footer,
                                header.getContext(),
                              )}
                        </Table.HeaderCell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Footer>
              </Table.Table>
            </Table.ScrollContainer>
          </Table.Root>

      <Table.Root>
            <Table.ScrollContainer>
              <Table.Table size="lg">
                <Table.Header>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <Table.Row key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <Table.HeaderCell key={header.id} align="left">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </Table.HeaderCell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Header>
                <Table.Body>
                  {table.getRowModel().rows.map((row) => (
                    <Table.Row key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
                <Table.Footer>
                  {table.getFooterGroups().map((footerGroup) => (
                    <Table.Row key={footerGroup.id}>
                      {footerGroup.headers.map((header) => (
                        <Table.HeaderCell key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.footer,
                                header.getContext(),
                              )}
                        </Table.HeaderCell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Footer>
              </Table.Table>
            </Table.ScrollContainer>
          </Table.Root>
    </div>
  )
}