import { parse } from "@std/xml"

export interface XmlNode {
  type: string
  name?: { raw: string; local: string }
  attributes?: Record<string, string>
  children?: XmlNode[]
  text?: string
}

export function parseXml(text: string): XmlNode {
  return parse(text).root as unknown as XmlNode
}

export function elements(node: XmlNode, local: string): XmlNode[] {
  return (node.children ?? []).filter(
    (child) => child.type === "element" && child.name?.local === local,
  )
}

export function findAll(node: XmlNode, local: string): XmlNode[] {
  const found: XmlNode[] = []
  if (node.type === "element" && node.name?.local === local) found.push(node)
  for (const child of node.children ?? []) found.push(...findAll(child, local))
  return found
}

export function textOf(node: XmlNode | undefined): string {
  if (!node) return ""
  if (node.type === "text" || node.type === "cdata") return node.text ?? ""
  return (node.children ?? []).map(textOf).join("")
}

export function firstText(node: XmlNode, local: string): string {
  return textOf(elements(node, local)[0])
}

export function attr(node: XmlNode, local: string): string {
  return node.attributes?.[local] ?? ""
}

export function firstLink(node: XmlNode): string {
  for (const link of elements(node, "link")) {
    const href = attr(link, "href")
    if (href) return href
    const text = textOf(link)
    if (text) return text
  }
  return ""
}
