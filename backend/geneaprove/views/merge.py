"""
Handles merging of personas.
"""


import heapq
import datetime
from geneaprove.views.graph import global_graph
from geneaprove.views.queries import PersonSet


# Maximum number of years in a typical lifespan, when we have to guess
maximum_lifespan = 100


def debug(msg):
    # print msg
    pass


def compare(p1, p2):
    """Compare two persons, and return the score."""

    score = 0

    # For each similar event with the same date, increase score

    a1_events = dict()
    for a1 in p1.all_events.values():
        r = (a1.event.type, a1.role)
        a1_events[r] = a1_events.get(r, []) + [a1.event]

    one_year = datetime.timedelta(days=365)
    place_score = 0   # If at least two events occurred in same place.
    # This help separate people from different cities

    for a2 in p2.all_events.values():
        evt_score = 0   # best score for this event
        evt_debug = ""
        evt_evt = None

        r = (a2.event.type, a2.role)

        # Compare with similar events where the person plays the same role
        if r in a1_events:
            for ev in a1_events[r]:
                tmp_score = 0  # score for this comparison
                tmp_debug = ""

                match = True

                if ev.date_sort is None and a2.event.date_sort is None:
                    tmp_score += 5  # Both dates unknown
                    tmp_debug += " [Both dates unknown]"
                elif ev.date_sort is None or a2.event.date_sort is None:
                    tmp_score += 5  # Only one is unknown, might have been set
                    # somewhere else
                    tmp_debug += " [One date unknown]"
                elif ev.date_sort == a2.event.date_sort:
                    tmp_score += 20  # Same dates
                    tmp_debug += f" [Same sort {ev.date_sort}]"

                    if ev.date == a2.event.date:
                        # Further bonus since both dates are written exactly
                        # the same (so were not modified if we have an export,
                        # modif, import cycle)
                        tmp_score += 20
                        tmp_debug += " [Same date]"

                if ev.place is not None and ev.place == a2.event.place:
                    place_score = 20  # At least same place once

                if tmp_score > evt_score:
                    evt_score = tmp_score
                    evt_debug = tmp_debug
                    evt_evt = ev

        if evt_score:
            score += evt_score
            debug(f"evt_score ({a2.event}) ({evt_evt}) {evt_debug} => {evt_score} / {score}")

    # Also compare properties (this also compares names)
    # For UID properties, the score increase is worth more

    a1_chars = dict()
    for a1 in p1.all_chars.values():
        r = a1.char.name   # a1.char is a Characteristic: name, place, date
        # a1.parts is a part: type, name
        a1_chars[r] = a1_chars.get(r, []) + [a1]

    for a2 in p2.all_chars.values():
        r = a2.char.name
        if r in a1_chars:
            for att in a1_chars[r]:
                if att.char.place is not None \
                   and att.char.place == a2.char.place:
                    place_score = 20

                if att.char.date is not None \
                   and att.char.date == a2.char.date:
                    score += 20  # Same date
                    debug(f"  char, same date {att.char.date} {score}")

                parts = {p.name: p.value for p in att.parts}
                for p in a2.parts:
                    if p.name in parts \
                       and parts[p.name].lower() == p.value.lower():
                        score += 20  # Same property
                        debug(f"   char, same property {p.name} {p.value} {score}")

                        if r in ("_UID",):
                            score += 300  # Same uid, likely same person
                            debug(f"   char, same UID {score}")

    if place_score:
        score += place_score
        debug(f"At least two events in same place => {score} ")

    return score


def find_candidate():
    """Find all candidate personas for a merge"""

    p1 = 7843  # Emmanuel Briot
    p2 = 1     # Emmanuel Briot
    p3 = 3052  # Marie HOUTEVILLE
    p4 = 3335  # Thomine Levesque
    p5 = 1311
    p6 = 7842

    persons = extended_personas(
        graph=global_graph,
        nodes=set([global_graph.node_from_id(p1),
                   global_graph.node_from_id(p2),
                   global_graph.node_from_id(p3),
                   global_graph.node_from_id(p4),
                   global_graph.node_from_id(p5),
                   global_graph.node_from_id(p6)]),
        styles=None, query_groups=False)
    for p in [(p1, p2), (p2, p1), (p3, p4), (p5, p6), (p6, p5)]:
        score = compare(persons[p[0]], persons[p[1]])

    # Get all persons from the database with a guess at their lifespan.
    # If we know the birth date, lifespan starts there, otherwise it starts
    #   some years before the first event
    # Likewise for death date.
    # This results is potentially over-optimistic lifespans, but still reduces
    # the number of comparisons to do.
    # The following query (and its processing) might take a while on big
    # databases, but we'll need access to the whole information for persons
    # anyway, so we might as well query everything from the start)
    # number of persons: 9171
    #   number of queries:6   total queries time:0.26s   total time:26.21s

    persons = extended_personas(
        nodes=None, styles=None, graph=global_graph, query_groups=False)

    # A temporary structure ordered by the first date in lifespan

    births = []
    delta = datetime.timedelta(days=maximum_lifespan * 365)

    for p in persons.values():
        birth = death = None

        if p.birth is not None:
            birth = p.birth.date_sort
        if p.death is not None:
            death = p.death.date_sort
        if birth is None or death is None:
            h = [a.event.date_sort
                 for a in p.all_events.values()
                 if a.event.date_sort is not None]
            if h:
                h.sort()
                birth = birth or h[0] - delta
                death = death or h[-1] + delta

        # If birth is None, that means there are no events, and we don't
        # really want to merge that person then.
        if birth:
            p.max_lifespan = death
            heapq.heappush(births, (birth, p))

    # Now we traverse the list and only compare persons that were alive at
    # the same time (otherwise we assume they cannot be merged)
    # ??? We can save time by not comparing when we have already
    # decided in the past they can't be the same

    alive = []  # Each person alive at the given date
    comparisons = 0
    same = 0

    while births:
        date, person = heapq.heappop(births)

        for a in alive:
            if a.max_lifespan < date:
                alive.remove(a)
            elif date.year < 1970:
                continue
            else:
                # print(f"Compare {person.name} and {a.name}")
                comparisons += 1
                score = compare(a, person)
                if score >= 150:
                    print(
                        f"{date.year} Might be the same: {person.id} {person.name} and {a.id} {a.name}, score={score} {compare(person, a)}")
                    same += 1

        alive.append(person)

    # Maximum comparisons (n^2) would be: 83_302_129
    # Actual comparisons with this algo:  14_635_289
    print("Number of comparisons: ", comparisons)
    print("Possible merges: ", same)


def view(request):
    global_graph.update_if_needed()
    find_candidate()
