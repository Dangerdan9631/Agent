using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;
using StarCruiseStudios.Atlas.Cs.Model;

namespace StarCruiseStudios.Atlas.Cs.Infrastructure;

/// <summary>
/// Extracts portable declarations and compiler-resolved relationships from one C# project target.
/// </summary>
public sealed class CSharpModuleExtractor
{
    private readonly IAtlasLogger logger;

    /// <summary>
    /// Creates extraction with one diagnostic boundary.
    /// </summary>
    /// <param name="logger">Logger receiving workspace and compilation decisions.</param>
    public CSharpModuleExtractor(IAtlasLogger logger)
    {
        this.logger = logger;
    }

    /// <summary>
    /// Extracts one target-specific project from compiler-loaded documents.
    /// </summary>
    /// <param name="target">Selected target-specific project descriptor.</param>
    /// <param name="documents">Physical and generated documents loaded by the CLI boundary.</param>
    /// <returns>Unlinked declarations and semantic relationships.</returns>
    public async Task<ExtractedModule> ExtractAsync(
        CSharpProjectTarget target,
        IReadOnlyList<Document> documents)
    {
        this.logger.Info("Extracting compiler-loaded C# documents.", new Dictionary<string, object?>
        {
            ["module"] = target.Identity.Id,
            ["documents"] = documents.Count
        });
        return await new ExtractionState(target, new CSharpModelIdentity(target.Identity.Id), new CSharpDocumentPathResolver())
            .ExtractAsync(documents).ConfigureAwait(false);
    }

    private sealed class ExtractionState
    {
        private static readonly SymbolDisplayFormat TypeDisplayFormat = new(
            globalNamespaceStyle: SymbolDisplayGlobalNamespaceStyle.Omitted,
            typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypesAndNamespaces,
            genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters,
            miscellaneousOptions: SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers
                | SymbolDisplayMiscellaneousOptions.IncludeNullableReferenceTypeModifier);

        private readonly CSharpProjectTarget target;
        private readonly CSharpModelIdentity identity;
        private readonly CSharpDocumentPathResolver pathResolver;
        private readonly Dictionary<string, AtlasElement> elements = new(StringComparer.Ordinal);
        private readonly List<PendingRelationship> relationships = [];
        private readonly Dictionary<SyntaxNode, string> ownerIds = new(ReferenceEqualityComparer.Instance);
        private readonly Dictionary<SyntaxTree, string> sourceUnitIds = new(ReferenceEqualityComparer.Instance);

        internal ExtractionState(
            CSharpProjectTarget target,
            CSharpModelIdentity identity,
            CSharpDocumentPathResolver pathResolver)
        {
            this.target = target;
            this.identity = identity;
            this.pathResolver = pathResolver;
        }

        internal async Task<ExtractedModule> ExtractAsync(IReadOnlyList<Document> documents)
        {
            var contexts = new List<DocumentContext>();
            foreach (var document in documents)
            {
                var source = this.pathResolver.Resolve(document, this.target.ProjectRootPath, this.target.SourceRoots);
                if (source is null)
                {
                    continue;
                }

                var root = await document.GetSyntaxRootAsync().ConfigureAwait(false);
                var semanticModel = await document.GetSemanticModelAsync().ConfigureAwait(false);
                if (root is null || semanticModel is null)
                {
                    continue;
                }

                contexts.Add(new DocumentContext(document, root, semanticModel, source));
                this.RegisterDeclarations(root, semanticModel, source);
            }

            foreach (var context in contexts)
            {
                this.RegisterRelationships(context);
            }

            return new ExtractedModule(
                this.target,
                this.elements.Values.OrderBy(element => element.Id, StringComparer.Ordinal).ToArray(),
                this.relationships
                    .DistinctBy(relationship => string.Join('\0', relationship.SourceElementId, relationship.Kind, relationship.TargetQualifiedName, relationship.TargetSignature))
                    .OrderBy(relationship => relationship.SourceElementId, StringComparer.Ordinal)
                    .ThenBy(relationship => relationship.Kind, StringComparer.Ordinal)
                    .ThenBy(relationship => relationship.TargetQualifiedName, StringComparer.Ordinal)
                    .ToArray());
        }

        private void RegisterDeclarations(SyntaxNode root, SemanticModel semanticModel, CSharpSourcePath source)
        {
            var sourceUnit = this.AddElement("source-unit", source.Path, Path.GetFileName(source.Path), source.Path, null, null, source);
            this.sourceUnitIds[semanticModel.SyntaxTree] = sourceUnit.Id;
            foreach (var node in root.DescendantNodes().OrderBy(node => node.SpanStart))
            {
                switch (node)
                {
                    case BaseNamespaceDeclarationSyntax namespaceNode:
                        this.RegisterNamespace(namespaceNode, semanticModel);
                        break;
                    case BaseTypeDeclarationSyntax typeNode:
                        this.RegisterType(typeNode, semanticModel, source, sourceUnit.Id);
                        break;
                    case DelegateDeclarationSyntax delegateNode:
                        this.RegisterDelegate(delegateNode, semanticModel, source, sourceUnit.Id);
                        break;
                    case ConstructorDeclarationSyntax constructorNode:
                        this.RegisterMethod(constructorNode, semanticModel.GetDeclaredSymbol(constructorNode), "constructor", source);
                        break;
                    case MethodDeclarationSyntax methodNode:
                        this.RegisterMethod(methodNode, semanticModel.GetDeclaredSymbol(methodNode), "method", source);
                        break;
                    case OperatorDeclarationSyntax operatorNode:
                        this.RegisterMethod(operatorNode, semanticModel.GetDeclaredSymbol(operatorNode), "method", source);
                        break;
                    case ConversionOperatorDeclarationSyntax conversionNode:
                        this.RegisterMethod(conversionNode, semanticModel.GetDeclaredSymbol(conversionNode), "method", source);
                        break;
                    case PropertyDeclarationSyntax propertyNode:
                        this.RegisterProperty(propertyNode, semanticModel.GetDeclaredSymbol(propertyNode), source);
                        break;
                    case IndexerDeclarationSyntax indexerNode:
                        this.RegisterProperty(indexerNode, semanticModel.GetDeclaredSymbol(indexerNode), source);
                        break;
                    case EventDeclarationSyntax eventNode:
                        this.RegisterEvent(eventNode, semanticModel.GetDeclaredSymbol(eventNode), source);
                        break;
                    case FieldDeclarationSyntax fieldNode:
                        this.RegisterFields(fieldNode, semanticModel, source, fieldNode.Modifiers.Any(SyntaxKind.ConstKeyword), false);
                        break;
                    case EventFieldDeclarationSyntax eventFieldNode:
                        this.RegisterFields(eventFieldNode, semanticModel, source, false, true);
                        break;
                    case EnumMemberDeclarationSyntax enumMemberNode:
                        this.RegisterEnumMember(enumMemberNode, semanticModel, source);
                        break;
                }
            }
        }

        private void RegisterNamespace(BaseNamespaceDeclarationSyntax node, SemanticModel semanticModel)
        {
            if (semanticModel.GetDeclaredSymbol(node) is not INamespaceSymbol symbol)
            {
                return;
            }

            var element = this.RegisterNamespaceSymbol(symbol);
            this.ownerIds[node] = element.Id;
        }

        private AtlasElement RegisterNamespaceSymbol(INamespaceSymbol symbol)
        {
            var parentId = symbol.ContainingNamespace is { IsGlobalNamespace: false } parent
                ? this.RegisterNamespaceSymbol(parent).Id
                : null;
            var qualifiedName = this.QualifiedName(symbol);
            return this.AddElement("namespace", qualifiedName, symbol.Name, qualifiedName, null, parentId, null);
        }

        private void RegisterType(
            BaseTypeDeclarationSyntax node,
            SemanticModel semanticModel,
            CSharpSourcePath source,
            string sourceUnitId)
        {
            if (semanticModel.GetDeclaredSymbol(node) is not INamedTypeSymbol symbol)
            {
                return;
            }

            var kind = this.TypeKind(symbol, node);
            var qualifiedName = this.QualifiedName(symbol);
            var parentId = symbol.ContainingType is null
                ? sourceUnitId
                : this.TypeElementId(symbol.ContainingType);
            var element = this.AddElement(kind, qualifiedName, symbol.Name, qualifiedName, null, parentId, source, this.TypeTraits(symbol, node));
            this.ownerIds[node] = element.Id;
            this.RegisterPrimaryConstructorMembers(node, semanticModel, symbol, source);
            if (symbol.BaseType is not null && symbol.BaseType.SpecialType != SpecialType.System_Object
                && kind is not "interface" and not "annotation")
            {
                this.AddPending(element.Id, "inherits", symbol.BaseType);
            }

            foreach (var interfaceType in symbol.Interfaces)
            {
                this.AddPending(element.Id, kind == "interface" ? "inherits" : "implements", interfaceType);
            }
        }

        private void RegisterPrimaryConstructorMembers(
            BaseTypeDeclarationSyntax node,
            SemanticModel semanticModel,
            INamedTypeSymbol type,
            CSharpSourcePath source)
        {
            var parameterList = node switch
            {
                RecordDeclarationSyntax record => record.ParameterList,
                TypeDeclarationSyntax declaration => declaration.ParameterList,
                _ => null
            };
            if (parameterList is null)
            {
                return;
            }

            var constructor = parameterList.Parameters
                .Select(parameter => semanticModel.GetDeclaredSymbol(parameter)?.ContainingSymbol)
                .OfType<IMethodSymbol>()
                .FirstOrDefault()
                ?? type.InstanceConstructors.FirstOrDefault(candidate =>
                    candidate.DeclaringSyntaxReferences.Any(reference => reference.Span == node.Span));
            this.RegisterMethod(parameterList, constructor, "constructor", source);

            if (node is not RecordDeclarationSyntax)
            {
                return;
            }

            foreach (var parameter in parameterList.Parameters)
            {
                var property = type.GetMembers(parameter.Identifier.ValueText)
                    .OfType<IPropertySymbol>()
                    .FirstOrDefault(candidate => candidate.DeclaringSyntaxReferences.Any(reference => reference.Span == parameter.Span));
                this.RegisterProperty(parameter, property, source);
            }
        }

        private void RegisterDelegate(
            DelegateDeclarationSyntax node,
            SemanticModel semanticModel,
            CSharpSourcePath source,
            string sourceUnitId)
        {
            if (semanticModel.GetDeclaredSymbol(node) is not INamedTypeSymbol symbol)
            {
                return;
            }

            var qualifiedName = this.QualifiedName(symbol);
            var parentId = symbol.ContainingType is null ? sourceUnitId : this.TypeElementId(symbol.ContainingType);
            var element = this.AddElement("delegate", qualifiedName, symbol.Name, qualifiedName, this.MethodSignature(symbol.DelegateInvokeMethod), parentId, source, this.AccessibilityTraits(symbol));
            this.ownerIds[node] = element.Id;
        }

        private void RegisterMethod(SyntaxNode node, IMethodSymbol? symbol, string kind, CSharpSourcePath source)
        {
            if (symbol is null)
            {
                return;
            }

            var qualifiedName = this.QualifiedName(symbol);
            var signature = this.MethodSignature(symbol);
            var traits = this.AccessibilityTraits(symbol).Concat(this.MethodTraits(symbol)).Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
            var element = this.AddElement(kind, qualifiedName, this.MethodName(symbol), qualifiedName, signature, this.TypeElementId(symbol.ContainingType), source, traits);
            this.ownerIds[node] = element.Id;
        }

        private void RegisterProperty(SyntaxNode node, IPropertySymbol? symbol, CSharpSourcePath source)
        {
            if (symbol is null)
            {
                return;
            }

            var qualifiedName = this.QualifiedName(symbol);
            var signature = symbol.IsIndexer ? this.PropertySignature(symbol) : null;
            var traits = this.AccessibilityTraits(symbol)
                .Concat(symbol.IsStatic ? ["static"] : [])
                .Concat(symbol.SetMethod is null ? [] : symbol.SetMethod.IsInitOnly ? ["init-only"] : ["mutable"])
                .Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
            var element = this.AddElement("property", qualifiedName, symbol.IsIndexer ? "this" : symbol.Name, qualifiedName, signature, this.TypeElementId(symbol.ContainingType), source, traits);
            this.ownerIds[node] = element.Id;
        }

        private void RegisterEvent(SyntaxNode node, IEventSymbol? symbol, CSharpSourcePath source)
        {
            if (symbol is null)
            {
                return;
            }

            var qualifiedName = this.QualifiedName(symbol);
            var traits = this.AccessibilityTraits(symbol)
                .Concat(symbol.IsStatic ? ["static"] : [])
                .Append("event")
                .Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
            var element = this.AddElement("property", qualifiedName, symbol.Name, qualifiedName, null, this.TypeElementId(symbol.ContainingType), source, traits);
            this.ownerIds[node] = element.Id;
        }

        private void RegisterFields(
            BaseFieldDeclarationSyntax node,
            SemanticModel semanticModel,
            CSharpSourcePath source,
            bool constant,
            bool eventLike)
        {
            foreach (var variable in node.Declaration.Variables)
            {
                if (semanticModel.GetDeclaredSymbol(variable) is not IFieldSymbol symbol)
                {
                    continue;
                }

                var qualifiedName = this.QualifiedName(symbol);
                var traits = this.AccessibilityTraits(symbol)
                    .Concat(symbol.IsStatic ? ["static"] : [])
                    .Concat(symbol.IsReadOnly ? ["readonly"] : [])
                    .Concat(eventLike ? ["event"] : [])
                    .Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
                var element = this.AddElement(constant ? "constant" : eventLike ? "property" : "field", qualifiedName, symbol.Name, qualifiedName, null, this.TypeElementId(symbol.ContainingType), source, traits);
                this.ownerIds[variable] = element.Id;
                this.ownerIds[node] = element.Id;
            }
        }

        private void RegisterEnumMember(EnumMemberDeclarationSyntax node, SemanticModel semanticModel, CSharpSourcePath source)
        {
            if (semanticModel.GetDeclaredSymbol(node) is not IFieldSymbol symbol)
            {
                return;
            }

            var qualifiedName = this.QualifiedName(symbol);
            var element = this.AddElement("constant", qualifiedName, symbol.Name, qualifiedName, null, this.TypeElementId(symbol.ContainingType), source, ["const", "public", "static"]);
            this.ownerIds[node] = element.Id;
        }

        private void RegisterRelationships(DocumentContext context)
        {
            var sourceUnitId = this.sourceUnitIds[context.SemanticModel.SyntaxTree];
            new RelationshipWalker(this, context.SemanticModel, sourceUnitId).Visit(context.Root);
        }

        private AtlasElement AddElement(
            string kind,
            string qualifiedName,
            string name,
            string identityName,
            string? signature,
            string? parentId,
            CSharpSourcePath? source,
            IReadOnlyList<string>? traits = null)
        {
            var finalTraits = (traits ?? [])
                .Concat(source?.Generated == true ? ["generated"] : [])
                .Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
            var element = new AtlasElement(
                this.identity.ElementId(kind, identityName, signature),
                name,
                kind,
                qualifiedName,
                signature,
                parentId,
                source?.Path,
                finalTraits.Length == 0 ? null : finalTraits);
            if (!this.elements.TryGetValue(element.Id, out var existing) || this.Prefer(element, existing))
            {
                this.elements[element.Id] = element;
            }

            return this.elements[element.Id];
        }

        private bool Prefer(AtlasElement candidate, AtlasElement existing)
        {
            var candidateGenerated = candidate.Traits?.Contains("generated", StringComparer.Ordinal) == true;
            var existingGenerated = existing.Traits?.Contains("generated", StringComparer.Ordinal) == true;
            if (candidateGenerated != existingGenerated)
            {
                return !candidateGenerated;
            }

            return StringComparer.Ordinal.Compare(candidate.SourcePath, existing.SourcePath) < 0;
        }

        private void AddPending(string sourceId, string kind, ISymbol symbol)
        {
            var unaliased = symbol switch
            {
                IAliasSymbol alias => alias.Target,
                _ => symbol
            };
            var targetSymbol = unaliased switch
            {
                IMethodSymbol constructedMethod => constructedMethod.ReducedFrom?.OriginalDefinition ?? constructedMethod.OriginalDefinition,
                INamedTypeSymbol type => type.OriginalDefinition,
                IPropertySymbol property => property.OriginalDefinition,
                IFieldSymbol field => field.OriginalDefinition,
                IEventSymbol eventSymbol => eventSymbol.OriginalDefinition,
                _ => unaliased
            };
            if (targetSymbol is ITypeParameterSymbol || targetSymbol is INamedTypeSymbol { SpecialType: not SpecialType.None })
            {
                return;
            }

            var signature = targetSymbol is IMethodSymbol method ? this.MethodSignature(method) : null;
            var qualifiedName = this.QualifiedName(targetSymbol);
            if (qualifiedName.Length == 0)
            {
                return;
            }

            this.relationships.Add(new PendingRelationship(sourceId, kind, qualifiedName, signature, qualifiedName + signature));
        }

        private string OwnerId(SyntaxNode node, string sourceUnitId)
        {
            for (var current = node; current is not null; current = current.Parent)
            {
                if (this.ownerIds.TryGetValue(current, out var ownerId))
                {
                    return ownerId;
                }
            }

            return sourceUnitId;
        }

        private string TypeKind(INamedTypeSymbol symbol, BaseTypeDeclarationSyntax syntax)
        {
            if (syntax is RecordDeclarationSyntax)
            {
                return "record";
            }

            return symbol.TypeKind switch
            {
                Microsoft.CodeAnalysis.TypeKind.Interface => "interface",
                Microsoft.CodeAnalysis.TypeKind.Struct => "struct",
                Microsoft.CodeAnalysis.TypeKind.Enum => "enum",
                Microsoft.CodeAnalysis.TypeKind.Class when this.IsAttribute(symbol) => "annotation",
                _ => "class"
            };
        }

        private bool IsAttribute(INamedTypeSymbol symbol)
        {
            for (var current = symbol.BaseType; current is not null; current = current.BaseType)
            {
                if (current.ToDisplayString() == "System.Attribute")
                {
                    return true;
                }
            }

            return false;
        }

        private IReadOnlyList<string> TypeTraits(INamedTypeSymbol symbol, BaseTypeDeclarationSyntax syntax)
        {
            var traits = this.AccessibilityTraits(symbol).ToList();
            if (symbol.IsStatic) traits.Add("static");
            if (symbol.IsAbstract && !symbol.IsStatic) traits.Add("abstract");
            if (symbol.IsSealed && !symbol.IsStatic) traits.Add("sealed");
            if (symbol.IsReadOnly) traits.Add("readonly");
            if (symbol.IsRefLikeType) traits.Add("ref-like");
            if (syntax.Modifiers.Any(SyntaxKind.PartialKeyword)) traits.Add("partial");
            if (syntax is RecordDeclarationSyntax record && record.ClassOrStructKeyword.IsKind(SyntaxKind.StructKeyword)) traits.Add("record-struct");
            return traits.Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
        }

        private IReadOnlyList<string> AccessibilityTraits(ISymbol symbol)
            => [symbol.DeclaredAccessibility.ToString().ToLowerInvariant()];

        private IReadOnlyList<string> MethodTraits(IMethodSymbol symbol)
        {
            var traits = new List<string>();
            if (symbol.IsStatic) traits.Add("static");
            if (symbol.IsAbstract) traits.Add("abstract");
            if (symbol.IsSealed) traits.Add("sealed");
            if (symbol.IsAsync) traits.Add("async");
            if (symbol.IsExtensionMethod) traits.Add("extension");
            if (symbol.MethodKind is MethodKind.UserDefinedOperator or MethodKind.Conversion) traits.Add("operator");
            return traits;
        }

        private string TypeElementId(INamedTypeSymbol symbol)
        {
            var kind = symbol.TypeKind switch
            {
                Microsoft.CodeAnalysis.TypeKind.Interface => "interface",
                Microsoft.CodeAnalysis.TypeKind.Struct => symbol.IsRecord ? "record" : "struct",
                Microsoft.CodeAnalysis.TypeKind.Enum => "enum",
                Microsoft.CodeAnalysis.TypeKind.Delegate => "delegate",
                _ when symbol.IsRecord => "record",
                _ when this.IsAttribute(symbol) => "annotation",
                _ => "class"
            };
            return this.identity.ElementId(kind, this.QualifiedName(symbol));
        }

        private string QualifiedName(ISymbol symbol)
        {
            return symbol switch
            {
                INamespaceSymbol namespaceSymbol => namespaceSymbol.ToDisplayString(TypeDisplayFormat),
                INamedTypeSymbol typeSymbol => typeSymbol.ToDisplayString(TypeDisplayFormat),
                IMethodSymbol methodSymbol => $"{this.QualifiedName(methodSymbol.ContainingType)}.{this.MethodName(methodSymbol)}",
                IPropertySymbol propertySymbol => $"{this.QualifiedName(propertySymbol.ContainingType)}.{(propertySymbol.IsIndexer ? "this" : propertySymbol.Name)}",
                IFieldSymbol fieldSymbol => $"{this.QualifiedName(fieldSymbol.ContainingType)}.{fieldSymbol.Name}",
                IEventSymbol eventSymbol => $"{this.QualifiedName(eventSymbol.ContainingType)}.{eventSymbol.Name}",
                _ => symbol.ToDisplayString(TypeDisplayFormat)
            };
        }

        private string MethodName(IMethodSymbol symbol)
        {
            return symbol.MethodKind switch
            {
                MethodKind.Constructor or MethodKind.StaticConstructor => ".ctor",
                MethodKind.UserDefinedOperator or MethodKind.Conversion => symbol.MetadataName,
                _ => symbol.Name
            };
        }

        private string? MethodSignature(IMethodSymbol? symbol)
        {
            if (symbol is null)
            {
                return null;
            }

            var generic = symbol.TypeParameters.Length == 0
                ? string.Empty
                : $"<{string.Join(',', symbol.TypeParameters.Select(parameter => parameter.Name))}>";
            var parameters = string.Join(',', symbol.Parameters.Select(parameter =>
                $"{this.RefPrefix(parameter.RefKind)}{parameter.Type.ToDisplayString(TypeDisplayFormat)}"));
            var result = symbol.MethodKind is MethodKind.Constructor or MethodKind.StaticConstructor
                ? string.Empty
                : $":{symbol.ReturnType.ToDisplayString(TypeDisplayFormat)}";
            return $"{generic}({parameters}){result}";
        }

        private string PropertySignature(IPropertySymbol symbol)
        {
            var parameters = string.Join(',', symbol.Parameters.Select(parameter =>
                $"{this.RefPrefix(parameter.RefKind)}{parameter.Type.ToDisplayString(TypeDisplayFormat)}"));
            return $"({parameters}):{symbol.Type.ToDisplayString(TypeDisplayFormat)}";
        }

        private string RefPrefix(RefKind refKind) => refKind == RefKind.None ? string.Empty : $"{refKind.ToString().ToLowerInvariant()} ";

        private sealed record DocumentContext(Document Document, SyntaxNode Root, SemanticModel SemanticModel, CSharpSourcePath Source);

        private sealed class RelationshipWalker : CSharpSyntaxWalker
        {
            private readonly ExtractionState state;
            private readonly SemanticModel semanticModel;
            private readonly string sourceUnitId;

            internal RelationshipWalker(ExtractionState state, SemanticModel semanticModel, string sourceUnitId)
            {
                this.state = state;
                this.semanticModel = semanticModel;
                this.sourceUnitId = sourceUnitId;
            }

            public override void VisitUsingDirective(UsingDirectiveSyntax node)
            {
                var symbol = this.semanticModel.GetSymbolInfo(node.Name!).Symbol;
                if (symbol is not null)
                {
                    this.state.AddPending(this.sourceUnitId, "imports", symbol);
                }

                base.VisitUsingDirective(node);
            }

            public override void VisitIdentifierName(IdentifierNameSyntax node)
            {
                if (node.Parent is not UsingDirectiveSyntax and not QualifiedNameSyntax and not AliasQualifiedNameSyntax)
                {
                    var symbol = this.semanticModel.GetSymbolInfo(node).Symbol;
                    if (symbol is INamedTypeSymbol or IFieldSymbol or IPropertySymbol or IEventSymbol)
                    {
                        this.state.AddPending(this.state.OwnerId(node, this.sourceUnitId), "references", symbol);
                    }
                }

                base.VisitIdentifierName(node);
            }

            public override void VisitPredefinedType(PredefinedTypeSyntax node)
            {
                base.VisitPredefinedType(node);
            }

            public override void VisitGenericName(GenericNameSyntax node)
            {
                this.AddTypeReference(node);
                base.VisitGenericName(node);
            }

            public override void VisitQualifiedName(QualifiedNameSyntax node)
            {
                this.AddTypeReference(node);
                base.VisitQualifiedName(node);
            }

            public override void VisitNullableType(NullableTypeSyntax node)
            {
                this.AddTypeReference(node);
                base.VisitNullableType(node);
            }

            public override void VisitArrayType(ArrayTypeSyntax node)
            {
                this.AddTypeReference(node.ElementType);
                base.VisitArrayType(node);
            }

            public override void VisitAttribute(AttributeSyntax node)
            {
                var type = this.semanticModel.GetTypeInfo(node).Type;
                if (type is not null)
                {
                    this.state.AddPending(this.state.OwnerId(node, this.sourceUnitId), "references", type);
                }

                base.VisitAttribute(node);
            }

            public override void VisitInvocationExpression(InvocationExpressionSyntax node)
            {
                if (this.semanticModel.GetOperation(node) is IInvocationOperation operation)
                {
                    this.state.AddPending(this.state.OwnerId(node, this.sourceUnitId), "calls", operation.TargetMethod);
                }

                base.VisitInvocationExpression(node);
            }

            public override void VisitObjectCreationExpression(ObjectCreationExpressionSyntax node)
            {
                if (this.semanticModel.GetOperation(node) is IObjectCreationOperation operation && operation.Constructor is not null)
                {
                    this.state.AddPending(this.state.OwnerId(node, this.sourceUnitId), "calls", operation.Constructor);
                }

                base.VisitObjectCreationExpression(node);
            }

            public override void VisitImplicitObjectCreationExpression(ImplicitObjectCreationExpressionSyntax node)
            {
                if (this.semanticModel.GetOperation(node) is IObjectCreationOperation operation && operation.Constructor is not null)
                {
                    this.state.AddPending(this.state.OwnerId(node, this.sourceUnitId), "calls", operation.Constructor);
                }

                base.VisitImplicitObjectCreationExpression(node);
            }

            public override void VisitConstructorInitializer(ConstructorInitializerSyntax node)
            {
                if (this.semanticModel.GetSymbolInfo(node).Symbol is IMethodSymbol constructor)
                {
                    this.state.AddPending(this.state.OwnerId(node, this.sourceUnitId), "calls", constructor);
                }

                base.VisitConstructorInitializer(node);
            }

            private void AddTypeReference(TypeSyntax node)
            {
                if (node.Parent is BaseTypeSyntax || node.Ancestors().Any(ancestor => ancestor is UsingDirectiveSyntax))
                {
                    return;
                }

                var type = this.semanticModel.GetTypeInfo(node).Type;
                if (type is not null)
                {
                    this.state.AddPending(this.state.OwnerId(node, this.sourceUnitId), "references", type);
                }
            }
        }
    }
}
