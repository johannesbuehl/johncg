#import "@preview/based:0.2.0": base64

#{
    let data = json("data.json")

    let metadata-table = (..children) => table(
        columns: (auto, 1fr),
        stroke: 1pt,
        align: top,

        ..children
    )

    let table-row = (dict, key, name) => {
        if key in dict.keys() {
            (
                name,
                [#dict.at(key)],
            )
        } else {
            none
        }
    }

    let to-json(v, i: 0) = {
        let indent = {
            let ii = 0

            while ii < i {
                "\t"
                ii += 1
            }
        }

        if type(v) == dictionary {
            let entries = v.keys().map(k => "\"" + k + "\": " + to-json(v.at(k), i: i + 1))

            "{\n\t" + indent + entries.join(",\n\t" + indent) + "\n" + indent + "}"
        } else if type(v) == array {
            "[\n\t" + indent + v.map(e => to-json(e, i: i + 1)).join(",\n\t" + indent) + "\n" + indent + "]"
        } else if type(v) == str {
            "\"" + v + "\""
        } else if type(v) == bool {
            if v {
                "true"
            } else {
                "false"
            }
        } else {
            str(v)
        }
    }
    let render-json(v) = raw(lang: "json", to-json(v))

    let b64-image(b64, width) = image(
        width: width,
        base64.decode(b64.split(",").at(-1)),
    )

    let thumbnail-single(b64, width: 50%, left: 1em, right: 1em) = if b64.len() > 0 {
        pad(
            left: left,
            right: right,
            box(
                radius: 0.25em,
                clip: true,
                b64-image(b64, width),
            ),
        )
    }

    let song-lang-styles = (
        (),
        (style: "italic", fill: luma(50%)),
        (style: "italic", fill: luma(60%)),
        (style: "italic", fill: luma(70%)),
    )

    let render-song = data => [
        #if "metadata" in data.keys() [
            #let titles = {
                data
                    .metadata
                    .Title
                    .enumerate()
                    .map(aa => {
                        let (ii, tt) = aa

                        text(..song-lang-styles.at(ii))[#tt]
                    })
                    .join(" ")
            }

            #metadata-table(
                "Title",
                titles,
                ..table-row(data.metadata, "Songbook", "Book"),
                ..table-row(data.metadata, "ChurchSongID", "ID"),
                ..table-row(data.metadata, "Melody", "Melody"),
                ..table-row(data.metadata, "Author", "Author"),
                ..table-row(data.metadata, "Translation", "Translation"),
                ..table-row(data.metadata, "Copyright", "Copyright"),
                ..table-row(data.metadata, "Time", "Time signature"),
                // ..table-row(data.metadata, "Key", "Key"),
                // ..table-row(data.metadata, "Tempo", "Tempo"),
                // ..table-row(data.metadata, "Transpose", "Transpose"),
            )

            == #titles
            #grid(
                columns: (1fr, 1fr),
                gutter: 1em,

                [

                    #for part in data.metadata.VerseOrder {
                        [=== #part]

                        let song_text = data.text.find(p => p.part == part)

                        if song_text != none {
                            song_text
                                .text
                                .map(slide => {
                                    let slide-text = slide.flatten().join("")
                                    if slide-text != none and slide-text.len() > 0 {
                                        box[
                                            #for line in slide {
                                                let ii = 0

                                                while ii < line.len() {
                                                    set par(hanging-indent: 1em, spacing: 0.6em)
                                                    set text(..song-lang-styles.at(ii))

                                                    line.at(ii)
                                                    linebreak()

                                                    ii += 1
                                                }
                                            }
                                        ]
                                    }
                                })
                                .join(v(0em))
                        }
                    }],
                thumbnail-single(data.metadata.BackgroundImage, width: 100%, left: 0em, right: 1em),
            )
        ]
    ]

    let render-psalm = data => [
        #if "metadata" in data.keys() [
            #metadata-table(
                ..table-row(data.metadata, "book", "Book"),
                ..table-row(data.metadata, "id", "ID"),
            )

            #let indent = if "indent" in data.metadata.keys() { data.metadata.indent } else { false }

            #let indent-counter = false

            #for slide in data.text {
                for text-block in slide {
                    pad(left: if indent-counter { 1em } else { 0em })[#text-block.join("\n")]

                    indent-counter = not indent-counter and indent
                }
            }
        ]
    ]

    let render-bible = data => [
        #if "text" in data.keys() {
            data.text
        }
    ]

    let render-template = data => [
        #if "template" in data.template.keys() {
            metadata-table(
                ..table-row(data.template, "template", "Template"),
            )

            if "data" in data.template.keys() [
                // #data.template.data
                #render-json(data.template.data)
            ]
        }
    ]

    let render-media = data => [
        #if "media" in data.keys() {
            metadata-table(
                ..table-row(data, "media", "Media"),
                ..table-row(data, "loop", "Loop"),
            )

            thumbnail-single(data.thumbnail)
        }
    ]

    let render-pdf = data => [
        #if "file" in data.keys() {
            metadata-table(
                ..table-row(data, "file", "File"),
            )

            pad(
                x: 1em,
                grid(
                    columns: (1fr, 1fr),
                    gutter: 1em,
                    ..data.thumbnails.map(thumbnail => if thumbnail.len() > 0 {
                        box(
                            stroke: 0.5pt + black,
                            clip: true,
                            radius: 0.1em,
                            image(bytes(thumbnail.data)),
                        )
                    })
                ),
            )
        }
    ]

    let countdown-modes = (
        end_time: "Endtime",
        duration: "Duration",
        stopwatch: "Stopwatch",
        clock: "Clock",
    )

    let render-countdown = data => [
        #if "data" in data.keys() [
            #metadata-table(
                ..table-row(data.data, "time", "Time"),
                "Mode",
                countdown-modes.at(data.data.mode),
                "Show seconds",
                raw(if data.data.show_seconds { "true" } else { "false" }),
                ..table-row(data.data, "font_size", "Textsize"),
                "Textcolor",
                [#box()[#square(
                        size: 0.7em,
                        fill: rgb(data.data.font_color),
                        radius: 0.1em,
                        stroke: 1pt + black,
                    )] #h(0.2em) #raw(data.data.font_color)],
                "Position",
                raw("x: " + str(data.data.position.x) + ", y: " + str(data.data.position.y)),
            )

            #thumbnail-single(data.thumbnail)
        ]

    ]

    let render-text = data => [
        #if "text" in data.keys() {
            data.text
        }
    ]

    let render-amcp = data => [
        #if "commands" in data.keys() {
            metadata-table(
                ..table-row(data.commands, "set_active", "Show"),
                ..table-row(data.commands, "set_inactive", "Hide"),
            )
        }
    ]

    let render-comment = data => []

    let element-type-map = (
        song: "Song",
        psalm: "Psalm",
        bible: "Bible",
        template: "Template",
        media: "Media",
        pdf: "PDF",
        countdown: "Countdown",
        text: "Text",
        amcp: "AMCP-command",
        comment: "Comment",
    )

    let renderer-map = (
        song: render-song,
        psalm: render-psalm,
        bible: render-bible,
        template: render-template,
        media: render-media,
        pdf: render-pdf,
        countdown: render-countdown,
        text: render-text,
        amcp: render-amcp,
        comment: render-comment,
    )

    // styling
    set page(
        paper: "a4",
        header: {
            [
                Playlist "#data.caption"
            ]
            h(1fr)

            if "file" in data.keys() {
                data.file
            }

            line(length: 100%, stroke: 0.5pt)
        },
        footer: context {
            line(length: 100%, stroke: 0.5pt)

            let date = data.export_date
            let match = date.match(regex("^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)(\.\d+)?([+-]\d+)?$"))

            [
                created #match.captures.at(0)-#match.captures.at(1)-#match.captures.at(2) #match.captures.at(3):#match.captures.at(4):#match.captures.at(5)
            ]

            h(1fr)
            counter(page).display("1")
        },

        numbering: "1",
    )

    set text(font: "Literata")

    show heading: set text(font: "Lexend")

    show heading.where(level: 1): set heading(numbering: "1.1")

    for item in data.items {
        [
            = #box()[#square(size: 0.7em, fill: rgb(item.color), radius: 0.1em)] #element-type-map.at(
                item.type,
            ) #text(weight: "light", emph["#item.caption"])
        ]

        renderer-map.at(item.type)(item)
    }
}

