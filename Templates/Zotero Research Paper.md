---
title: "{{title}}"
citekey: "{{citekey}}"
year: "{{date | format('YYYY')}}"
tags:
  - research-paper
---

# {{title}}

## Citation

{{bibliography}}

{% if abstractNote %}
## Abstract

{{abstractNote}}
{% endif %}

## My Notes

{% persist "my-notes" %}

{% endpersist %}

## PDF Annotations

{% persist "annotations" %}

{% for annotation in annotations %}
{% if annotation.annotatedText %}
> {{annotation.annotatedText}}
{% endif %}

{% if annotation.comment %}
**Comment:** {{annotation.comment}}
{% endif %}

{% if annotation.pageLabel %}
**Page:** {{annotation.pageLabel}}
{% endif %}

{% endfor %}

{% endpersist %}