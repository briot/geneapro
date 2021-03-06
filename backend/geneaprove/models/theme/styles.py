class Style(object):
    """
    An object that describes drawing styles to apply to GUI objects
    """

    def __init__(self, font_weight=None, color=None, stroke=None, fill=None):
        self.font_weight = font_weight
        self.color = color
        self.stroke = stroke
        self.fill = fill

        self._hash = hash((font_weight, color, stroke, fill))

    def __repr__(self):
        return f'<Style {self.to_json()}>'

    def __hash__(self):
        return self._hash

    def __eq__(self, second):
        # For proper use of hash tables
        return (self.font_weight == second.font_weight and
                self.color == second.color and
                self.stroke == second.stroke and
                self.fill == second.fill)

    def to_json(self):
        """
        Convert the style to a structure that can be encoded as JSON and then
        used by the GUI.
        """
        # Must match PersonStyle from src/Store/Styles.tsx
        result = {}
        if self.font_weight:
            result['fontWeight'] = self.font_weight
        if self.color:
            result['color'] = self.color
        if self.stroke:
            result['stroke'] = self.stroke
        if self.fill:
            result['fill'] = self.fill
        return result

    def merge(self, second):
        """
        Merge two styles to create a third one. `second` overrides any property
        set in self.
        """
        return Style(font_weight=second.font_weight or self.font_weight,
                     color=second.color or self.color,
                     fill=second.fill or self.fill,
                     stroke=second.stroke or self.stroke)
