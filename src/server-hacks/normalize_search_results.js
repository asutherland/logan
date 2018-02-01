/**
 * The input we currently looks like the following hierarchy.  The big thing is
 * that presentation has been baked in somewhat, like for the definitions of
 * the symbol "WorkerPrivate" the actual string we're dealing with is
 * "Definitions (WorkerPrivate)".
 *
 * - "normal"/"test"/"generated"
 *   - "Assignments (SYMBOL)"
 *   - "Declarations (SYMBOL)"
 *   - "Definitions (SYMBOL)"
 *   - "Files"
 *   - "IDL (SYMBOL)"
 *   - "Textual Occurrences"
 *   - "Uses (SYMBOL)"
 *
 * We include a couple hack transform passes to further divide things up that
 * I think are useful to distinguish.  These are:
 * - "forwards": A lot of times there are declarations that trivially match the
 *   regexp "^class FOO;$".  These are not helpful.  Obviously, semantic
 *   analysis can determine this even more powerfully, but this is a prototype
 *   of that.
 *
 * Our current normalization is to re-group so that we have a hierarchy like
 * so [fileType, source, :
 * - "normal"/"test"/"generated"
 *   - "files"
 *   - "fulltext"
 *   - "semantic"
 *     - SYMBOL
 *       - "defs"/"decls"/"uses"/"assignments"/"idl"/"forwards"
 *
 * This logic is derived from
 */
function normalizeSearchResults(orig) {

  // Helper to partition the contents of a hitList into two separate hitLists.
  // Our motivating example is separating forward declarations from normal
  // declarations because forward declarations are boring 99% of the time.
  //
  // Each hitList is an array of objects of the form { path, lines } where each
  // `lines` instance is an array of `lineObj` objects of the form { lno, line,
  // contextsym, bounds, context }.  We want to traverse through each of the
  // `lineObj`s to see if the function returns true, and if so, split the
  // lineObj from its siblings
  function filterHitList(hitList, entry, falseKey, trueKey, func) {
    let topHits = [];
    let topMisses = [];
    for (const pathLines of hitList) {
      // Build up a list of the hits and misses for this pathLine aggregate.
      let hits;
      let misses;
      for (const lineObj of pathLines.lines) {
        let match = func(lineObj);
        if (match) {
          if (!hits) {
            hits = [lineObj];
          } else {
            hits.push(lineObj);
          }
        } else {
          if (!misses) {
            misses = [lineObj];
          } else {
            misses.push(lineObj);
          }
        }
      }

      // All hits, no misses, we can reuse the pathLines object in its entirety.
      if (hits && !misses) {
        topHits.push(pathLines);
      // Both hits and misses, need to use our split lists.
      } else if (hits && misses) {
        topHits.push({
          path: pathLines.path,
          lines: hits
        });
        topMisses.push({
          path: pathLines.path,
          lines: misses
        });
      // Only misses, we can reuse the pathLines objects in its entirety.
      } else {
        topMisses.push(pathLines);
      }
    }

    if (topHits.length) {
      entry[trueKey] = topHits;
    }
    if (topMisses.length) {
      entry[falseKey] = topMisses;
    }
  }

  function stashSymbolInfo(map, symbol, kind, hitList) {
    let entry = map[symbol];
    if (!entry) {
      entry = {
        defs: undefined,
        decls: undefined,
        uses: undefined,
        assignments: undefined,
        idl: undefined,
        forwards: undefined
      };
      map[symbol] = entry;
    }

    switch (kind) {
      case "decls":
        filterHitList(
          hitList, entry, "decls", "forwards",
          (lineObj) => {
            return /^(?:class|struct) [^{]+;$/.test(lineObj.line);
          });
        break;

      case "defs":
        filterHitList(
          hitList, entry, "defs", "typedefs",
          (lineObj) => {
            return /^typedef [^{]+;$/.test(lineObj.line);
          });
        break;

      default:
        entry[kind] = hitList;
        break;
    }
  }


  function chewQKinds(qkinds) {
    const symMap = {};

    if (!qkinds) {
      return [];
    }

    let textMatches;
    let filesList;

    for (var qk in qkinds) {
      var value = qkinds[qk];
      var symbol;

      // Discriminate based on the 3rd letter which varies over all types.
      switch (qk[2]) {
        case "s": // "Assignments (".length === 13
          symbol = qk.slice(13, -1);
          stashSymbolInfo(symMap, symbol, "assignments", value);
          break;
        case "c": // "Declarations (".length === 14
          symbol = qk.slice(14, -1);
          stashSymbolInfo(symMap, symbol, "decls", value);
          break;
        case "f": // "Definitions (".length === 13
          symbol = qk.slice(13, -1);
          stashSymbolInfo(symMap, symbol, "defs", value);
          break;
        case "l": // "Files"
          filesList = [];
          for (const { path } of obj) {
            filesList.push(path);
          }
          filesList.sort();
          break;
        case "L": // "IDL (".length === 5
          symbol = qk.slice(5, -1);
          stashSymbolInfo(symMap, symbol, "idl", value);
          break;
        case "x": // "Textual Occurrences"
          textMatches = value;
          break;
        case "e": // "Uses (".length === 6
          symbol = qk.slice(6, -1);
          stashSymbolInfo(symMap, symbol, "uses", value);
          break;
      }
    }

    return {
      files: filesList,
      fulltext: textMatches,
      semantic: symMap
    };
  }

  return {
    normal: chewQKinds(orig.normal),
    test: chewQKinds(orig.test),
    generated: chewQKinds(orig.generated)
  };
}

module.exports = normalizeSearchResults;